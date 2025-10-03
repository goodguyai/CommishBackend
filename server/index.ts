import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { scheduler } from "./lib/scheduler";
import { storage } from "./storage";
import { serveStatic, log } from "./vite";
import { validateEnvironment, getEnv } from "./services/env";
import { generateRequestId } from "./lib/crypto";

const app = express();

// DO NOT mount global express.json() here - Discord interactions needs raw body
// JSON parsing is handled per-route or in routes.ts for /api endpoints

app.use(express.urlencoded({ extended: false }));

// Observability middleware: requestId, duration, outcome tracking
app.use((req, res, next) => {
  const requestId = generateRequestId();
  const start = Date.now();
  const path = req.path;
  let capturedResponse: any = undefined;

  // Attach requestId to request for use in routes
  (req as any).requestId = requestId;
  res.locals.requestId = requestId;
  
  // Phase 8.1: Add X-Request-Id header to all API responses
  if (path.startsWith('/api')) {
    res.setHeader('X-Request-Id', requestId);
  }

  // Capture res.json
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Capture res.send
  const originalResSend = res.send;
  res.send = function (body: any) {
    if (!capturedResponse) {
      capturedResponse = body;
    }
    return originalResSend.call(res, body);
  };

  // Capture res.write (for streaming responses)
  const chunks: any[] = [];
  const originalResWrite = res.write;
  res.write = function (chunk: any, encoding?: any, cb?: any): boolean {
    if (chunk) {
      chunks.push(chunk);
    }
    return originalResWrite.call(res, chunk, encoding, cb);
  };

  // Capture res.end
  const originalResEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    if (chunk) chunks.push(chunk);
    
    // Combine all chunks for logging
    if (!capturedResponse && chunks.length > 0) {
      capturedResponse = chunks.length === 1 ? chunks[0] : chunks.join('');
    } else if (!capturedResponse && chunk) {
      capturedResponse = chunk;
    }
    
    return originalResEnd.call(res, chunk, encoding, cb);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const outcome = res.statusCode >= 400 ? 'error' : 'success';
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} ${outcome} ${duration}ms`;
      
      if (capturedResponse) {
        let responseStr = typeof capturedResponse === 'object' 
          ? JSON.stringify(capturedResponse) 
          : String(capturedResponse);
        
        // Limit response preview to 200 chars for large payloads
        if (responseStr.length > 200) {
          responseStr = responseStr.substring(0, 197) + "...";
        }
        
        logLine += ` :: ${responseStr}`;
      }

      if (logLine.length > 300) {
        logLine = logLine.slice(0, 299) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment variables first - fail fast if missing
  validateEnvironment();

  // Build version header for debugging cache issues
  const BUILD_VERSION = process.env.BUILD_VERSION || new Date().toISOString();
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
      res.setHeader("X-Asset-Version", BUILD_VERSION);
    }
    next();
  });

  // API freshness: no-cache headers for all API responses
  app.use("/api", (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Add JSON parsing for ALL routes EXCEPT Discord interactions
  const jsonParser = express.json();
  app.use((req, res, next) => {
    if (req.path === "/api/discord/interactions") {
      return next(); // Skip JSON parsing for Discord webhook
    }
    jsonParser(req, res, next);
  });

  // Session middleware - must be before routes
  const PgSession = connectPgSimple(session);
  
  // Parse connection string and configure SSL properly for Supabase
  const dbUrl = new URL(getEnv().DATABASE_URL);
  dbUrl.searchParams.delete('sslmode'); // Remove sslmode param as we use ssl object instead
  
  const sessionPool = new pg.Pool({
    connectionString: dbUrl.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: "user_sessions",
        createTableIfMissing: false,
      }),
      secret: getEnv().SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: getEnv().NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  // CRITICAL: Register all API endpoints and WAIT for completion
  const server = await registerRoutes(app);

  // Initialize global cleanup job for expired wizard sessions
  scheduler.scheduleGlobalCleanup();
  
  // Phase 3: Initialize global content poster (every 5 minutes)
  scheduler.scheduleContentPoster();

  // Phase 5: Load all enabled reminders on startup
  (async () => {
    try {
      const allLeagues = await storage.getAllLeagues();
      for (const league of allLeagues) {
        const reminders = await storage.getReminders(league.id);
        const enabledReminders = reminders.filter(r => r.enabled);
        
        for (const reminder of enabledReminders) {
          scheduler.scheduleReminderJob(
            reminder.id,
            reminder.leagueId,
            reminder.cron,
            reminder.channelId || league.channelId || "",
            reminder.message || "Reminder",
            reminder.timezone || league.timezone || "America/New_York"
          );
        }
        
        if (enabledReminders.length > 0) {
          console.log(`Loaded ${enabledReminders.length} reminders for league ${league.name}`);
        }
      }
    } catch (error) {
      console.error("Failed to load reminders on startup:", error);
    }
  })();

  // Error handler middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = (req as any).requestId || 'unknown';

    console.error(`[${requestId}] Error ${status}:`, err);
    
    res.status(status).json({ 
      message,
      requestId,
      ...(app.get("env") === "development" && { stack: err.stack })
    });
  });

  // CRITICAL: Hard-stop for /api - prevent Vite from ever seeing API routes
  // This catches ANY /api/* request that didn't match a registered route
  app.use((req, res, next) => {
    // If this is an API request, it means no route matched - return JSON 404
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not Found", path: req.path });
    }
    // Otherwise, continue to Vite/static
    next();
  });

  // HTML no-cache middleware: Prevent CDN/proxy from caching HTML shell
  // This ensures data-testid attributes and UI updates are immediately visible
  app.use((req, res, next) => {
    // Only apply to non-API, HTML-serving requests
    if (!req.path.startsWith("/api/")) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  // Mount Vite/static ONLY AFTER all API routes are registered
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { scheduler } from "./lib/scheduler";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnvironment } from "./services/env";
import { generateRequestId } from "./lib/crypto";

const app = express();

// CRITICAL: Create API router and add JSON parsing TO IT
const apiRouter = express.Router();
const jsonParser = express.json();

// Add JSON parsing to router (skip for Discord interactions)
apiRouter.use((req, res, next) => {
  if (req.path === "/discord/interactions") {
    return next(); // Skip JSON for Discord webhook
  }
  jsonParser(req, res, next);
});

// Mount API router at /api BEFORE any other app-level middleware
app.use("/api", apiRouter);

// Now add other middleware for non-API routes
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
  
  const server = await registerRoutes(apiRouter as any);

  // Initialize global cleanup job for expired wizard sessions
  scheduler.scheduleGlobalCleanup();

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

  // CRITICAL: Add guard before Vite to prevent /api interception
  app.use((req, res, next) => {
    // Let API routes pass through - they were already registered above
    if (req.path.startsWith("/api")) {
      // If we reach here, no API route matched - return 404 JSON
      console.log(`[GUARD] Caught unmatched API route: ${req.method} ${req.path}`);
      return res.status(404).json({ error: "API endpoint not found" });
    }
    console.log(`[GUARD] Passing non-API route to Vite: ${req.method} ${req.path}`);
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

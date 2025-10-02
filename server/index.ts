import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { scheduler } from "./lib/scheduler";
import { serveStatic, log } from "./vite";
import { validateEnvironment } from "./services/env";
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

  // Prevent caching of API responses
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  // CRITICAL: Register all API endpoints and WAIT for completion
  const server = await registerRoutes(app);

  // Initialize global cleanup job for expired wizard sessions
  scheduler.scheduleGlobalCleanup();

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

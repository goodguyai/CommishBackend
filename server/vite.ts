import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

/**
 * Small helper: determine if this request is for our JSON API.
 * We guard both "/api" and "/api/*" (and an optional "/commish-api" lane).
 */
function isApiPath(url: string | undefined | null) {
  if (!url) return false;
  return (
    url === "/api" ||
    url.startsWith("/api/") ||
    url === "/commish-api" ||
    url.startsWith("/commish-api/")
  );
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  /**
   * IMPORTANT GUARD 1:
   * Wrap vite.middlewares so it NEVER runs for /api/*.
   * If it's an API request, we skip directly to the next middleware
   * (your Express API routes), avoiding HTML responses.
   */
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || "";
    if (isApiPath(url)) return next();
    return (vite.middlewares as any)(req, res, next);
  });

  /**
   * IMPORTANT GUARD 2:
   * The dev catch-all that serves index.html must also ignore /api/*.
   * Otherwise API calls return HTML.
   */
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl || req.url || "";
    if (isApiPath(url)) return next();

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Static assets (ok for any path; your API routes should be mounted before this in prod)
  app.use(express.static(distPath));

  /**
   * Production catch-all for SPA:
   * Also ignore /api/* so API requests never get index.html.
   */
  app.use("*", (req, res, next) => {
    const url = req.originalUrl || req.url || "";
    if (isApiPath(url)) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
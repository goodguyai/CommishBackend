import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  // Accept inbound X-Request-Id or generate new UUID
  const requestId = (req.headers['x-request-id'] as string) || nanoid();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-Id', requestId);
  
  // Log request with ID
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  
  next();
}

export function injectRequestIdIntoResponse(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body: any) {
    // Inject requestId into all JSON responses if it's an object
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      body.requestId = req.requestId;
    }
    return originalJson(body);
  };
  
  next();
}

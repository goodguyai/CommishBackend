import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: User;
    }
  }
}

/**
 * Optional Supabase authentication middleware
 * Extracts and verifies JWT from Authorization header
 * If valid, attaches user info to req.supabaseUser
 * If invalid or missing, calls next() without blocking (optional auth)
 */
export async function verifySupabaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[Auth Middleware] No Bearer token found, continuing without auth");
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      console.log("[Auth Middleware] Empty token, continuing without auth");
      return next();
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.log("[Auth Middleware] Invalid or expired token:", error?.message || "No user data");
      return next();
    }

    req.supabaseUser = data.user;
    console.log(`[Auth Middleware] Verified Supabase user: ${data.user.id}`);
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error verifying token:", error);
    next();
  }
}

/**
 * Required Supabase authentication middleware
 * Same as verifySupabaseToken but returns 401 if no valid token
 * Used for protected routes that require authentication
 */
export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[Auth Middleware] No Bearer token found");
      res.status(401).json({ 
        ok: false, 
        code: "UNAUTHORIZED", 
        message: "Missing or invalid authorization header" 
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      console.log("[Auth Middleware] Empty token");
      res.status(401).json({ 
        ok: false, 
        code: "UNAUTHORIZED", 
        message: "Empty authorization token" 
      });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.log("[Auth Middleware] Invalid or expired token:", error?.message || "No user data");
      res.status(401).json({ 
        ok: false, 
        code: "UNAUTHORIZED", 
        message: "Invalid or expired token" 
      });
      return;
    }

    req.supabaseUser = data.user;
    console.log(`[Auth Middleware] Verified Supabase user: ${data.user.id}`);
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error verifying token:", error);
    res.status(500).json({ 
      ok: false, 
      code: "AUTH_ERROR", 
      message: "Failed to verify authentication" 
    });
  }
}

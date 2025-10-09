import { Request, Response, NextFunction } from "express";
import { isDemo, isDemoId } from "../services/demo";

// UUID v4 regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware to validate leagueId parameter is a valid UUID
 * Handles demo mode by short-circuiting demo slugs (lg_demo_*)
 * Returns 422 with error envelope if invalid UUID in production
 */
export const leagueIdGuard = (paramName: string = "leagueId") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.params as any)[paramName] || (req.body as any)[paramName] || (req.query as any)[paramName];
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        code: "MISSING_LEAGUE_ID",
        message: `${paramName} is required`
      });
    }

    // Demo mode hard wall: allow demo slugs through and mark as demo
    if (isDemo() && isDemoId(id)) {
      (req as any).isDemo = true;
      (req as any).demoLeagueId = id;
      return next();
    }

    // Production: require valid UUID
    if (!UUID_PATTERN.test(id)) {
      return res.status(422).json({
        ok: false,
        code: "NON_UUID_LEAGUE_ID",
        message: `${paramName} must be a valid UUID (received: ${id})`
      });
    }

    // Valid UUID, continue
    (req as any).validatedLeagueId = id;
    next();
  };
};

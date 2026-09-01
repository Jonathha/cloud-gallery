import { Request, Response, NextFunction } from "express";
import { validateBanco1Token } from "./guarly/guarlyAuth";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string | null;
    email_verified?: boolean;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing authorization header" });
  }

  try {
    const user = await validateBanco1Token(authHeader);
    if (!user || !user.uid) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid user token" });
    }
    req.user = {
      uid: String(user.uid),
      email: user.email ? String(user.email) : null,
      email_verified: Boolean(user.email_verified)
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, error: "Unauthorized: " + (err.message || "Invalid token") });
  }
}

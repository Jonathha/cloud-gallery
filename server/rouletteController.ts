import { Request, Response } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { getUserRouletteStatus, processRouletteSpin } from "./workerRoulette/rouletteService.js";
import { getAdminRouletteUsers, getAdminRouletteSpins, getAdminRouletteSpinById, updateAdminUserSpins } from "./workerRoulette/adminService.js";

const DEFAULT_ADMIN_EMAILS = [
  "jogonesteterp@gmail.com",
  "matheusvitoor2026@gmail.com",
  "admin@jogonesteterp.com"
];

function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  return DEFAULT_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function handleRouletteStatusExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  try {
    const status = await getUserRouletteStatus(process.env, req.user.uid, req.user.email);
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}

export async function handleRouletteSpinExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "0.0.0.0";
  try {
    const result = await processRouletteSpin(process.env, req.user.uid, req.user.email, ip);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}

export async function handleAdminRouletteUsersExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !checkIsAdmin(req.user.email)) {
    return res.status(403).json({ success: false, error: "Forbidden: Admin only" });
  }
  try {
    const users = await getAdminRouletteUsers(process.env);
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}

export async function handleAdminRouletteSpinsExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !checkIsAdmin(req.user.email)) {
    return res.status(403).json({ success: false, error: "Forbidden: Admin only" });
  }
  try {
    const spins = await getAdminRouletteSpins(process.env);
    res.json({ success: true, spins });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}

export async function handleAdminRouletteSpinDetailExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !checkIsAdmin(req.user.email)) {
    return res.status(403).json({ success: false, error: "Forbidden: Admin only" });
  }
  try {
    const spin = await getAdminRouletteSpinById(process.env, req.params.id);
    if (!spin) {
      return res.status(404).json({ success: false, error: "Partida não encontrada." });
    }
    res.json({ success: true, spin });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}

export async function handleAdminUpdateUserSpinsExpress(req: AuthenticatedRequest, res: Response) {
  if (!req.user || !checkIsAdmin(req.user.email)) {
    return res.status(403).json({ success: false, error: "Forbidden: Admin only" });
  }
  const { userId, delta } = req.body || {};
  if (!userId || typeof delta !== "number") {
    return res.status(400).json({ success: false, error: "Parâmetros inválidos." });
  }
  try {
    const updatedUser = await updateAdminUserSpins(process.env, userId, delta);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Erro no servidor" });
  }
}


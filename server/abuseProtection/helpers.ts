import { Request } from "express";
import crypto from "crypto";
import { ModuleType } from "./types";

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ipStr.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

export function getAuthIdentifier(req: Request): string {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  return getClientIp(req);
}

export function getModuleAndId(req: Request): { module: ModuleType; id: string } {
  const path = req.path;
  
  if (path.startsWith('/api/share/view') || path.startsWith('/api/share_view') || path.startsWith('/share')) {
    return { module: 'share_view', id: getClientIp(req) };
  } else if (path === '/api/share/create' || path.startsWith('/api/share_create')) {
    return { module: 'share_create', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/share') || path.startsWith('/api/share_manage')) {
    return { module: 'share_manage', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/auth')) {
    return { module: 'auth', id: getClientIp(req) };
  } else if (path.includes('/upload')) {
    return { module: 'upload', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/storage')) {
    return { module: 'storage', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/roulette')) {
    return { module: 'roulette', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/logs')) {
    return { module: 'logs', id: getAuthIdentifier(req) };
  } else if (path.startsWith('/api/chat')) {
    return { module: 'chat', id: getAuthIdentifier(req) };
  }
  
  return { module: 'general', id: getClientIp(req) };
}

import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/auth';
import { HttpError } from '../lib/httpErrors';

export type AuthedRequest = Request & { user?: { id: string; roles: Array<'user' | 'admin'> } };

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing Authorization header'));

  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, roles: decoded.roles };
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid token'));
  }
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Unauthenticated'));
  if (!req.user.roles.includes('admin')) return next(new HttpError(403, 'Forbidden'));
  return next();
}

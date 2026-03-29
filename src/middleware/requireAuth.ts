import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/httpErrors';
import { verifyFirebaseIdToken } from '../lib/firebaseAdmin';
import { UserModel } from '../models/User';

export type AuthedRequest = Request & { user?: { id: string; roles: Array<'user' | 'admin'> } };

async function attachUserFromBearerToken(req: AuthedRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  const token = authHeader.slice('Bearer '.length);
  const decoded = await verifyFirebaseIdToken(token);

  const firebaseUid = decoded.uid;
  const email = decoded.email;
  if (!email) throw new HttpError(401, 'Firebase token missing email');

  let user = await UserModel.findOne({ firebaseUid });
  if (!user) {
    // Link existing local user by email, otherwise create a new one.
    user = await UserModel.findOne({ email });
    if (user) {
      user.firebaseUid = firebaseUid;
      await user.save();
    } else {
      user = await UserModel.create({
        firebaseUid,
        email,
        passwordHash: '',
        roles: ['user'],
        profile: { displayName: decoded.name ?? undefined, targetLanguage: 'de' },
        stats: { xpTotal: 0, level: 1, streakDays: 0 },
      });
    }
  }

  req.user = { id: String(user._id), roles: user.roles };
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing Authorization header'));

    await attachUserFromBearerToken(req);
    return next();
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes('Missing FIREBASE_SERVICE_ACCOUNT_JSON') ||
        err.message.includes('Invalid FIREBASE_SERVICE_ACCOUNT_JSON')
      ) {
        return next(err);
      }
    }
    return next(new HttpError(401, 'Invalid token'));
  }
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    await attachUserFromBearerToken(req);
  } catch {
    // Ignore invalid/missing tokens for optional auth.
  }
  return next();
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Unauthenticated'));
  if (!req.user.roles.includes('admin')) return next(new HttpError(403, 'Forbidden'));
  return next();
}

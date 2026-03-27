import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';

import { UserModel } from '../models/User';
import { HttpError } from '../lib/httpErrors';
import { signAccessToken } from '../lib/auth';
import { env } from '../lib/env';
import { requireAuth, AuthedRequest } from '../middleware/requireAuth';

export const authRouter = Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(1).optional(),
      })
      .parse(req.body);

    const existing = await UserModel.findOne({ email: body.email });
    if (existing) throw new HttpError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await UserModel.create({
      email: body.email,
      passwordHash,
      roles: ['user'],
      profile: { displayName: body.displayName, targetLanguage: 'de' },
      stats: { xpTotal: 0, level: 1, streakDays: 0 },
    });

    const token = signAccessToken({ sub: String(user._id), roles: user.roles });

    res.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        roles: user.roles,
        profile: user.profile,
        stats: user.stats,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/bootstrap-admin', async (req, res, next) => {
  try {
    if (!env.ADMIN_BOOTSTRAP_ENABLED) throw new HttpError(404, 'Not found');
    if (!env.ADMIN_BOOTSTRAP_TOKEN) throw new HttpError(500, 'Bootstrap token not configured');

    const body = z
      .object({
        token: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(1).optional(),
      })
      .parse(req.body);

    if (body.token !== env.ADMIN_BOOTSTRAP_TOKEN) throw new HttpError(401, 'Invalid bootstrap token');

    const existing = await UserModel.findOne({ email: body.email });
    if (existing) {
      if (!existing.roles.includes('admin')) {
        existing.roles = Array.from(new Set([...existing.roles, 'admin']));
      }
      if (body.displayName && !existing.profile?.displayName) {
        existing.profile = { ...(existing.profile ?? {}), displayName: body.displayName };
      }
      await existing.save();

      const token = signAccessToken({ sub: String(existing._id), roles: existing.roles });
      res.json({
        token,
        user: {
          id: String(existing._id),
          email: existing.email,
          roles: existing.roles,
          profile: existing.profile,
          stats: existing.stats,
          createdAt: existing.createdAt,
        },
      });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await UserModel.create({
      email: body.email,
      passwordHash,
      roles: ['admin'],
      profile: { displayName: body.displayName, targetLanguage: 'de' },
      stats: { xpTotal: 0, level: 1, streakDays: 0 },
    });

    const token = signAccessToken({ sub: String(user._id), roles: user.roles });
    res.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        roles: user.roles,
        profile: user.profile,
        stats: user.stats,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);

    const user = await UserModel.findOne({ email: body.email });
    if (!user) throw new HttpError(401, 'Invalid credentials');

    if (!user.passwordHash) {
      throw new HttpError(400, 'This account uses Firebase login');
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const token = signAccessToken({ sub: String(user._id), roles: user.roles });

    res.json({
      token,
      user: {
        id: String(user._id),
        email: user.email,
        roles: user.roles,
        profile: user.profile,
        stats: user.stats,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(404, 'User not found');

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        roles: user.roles,
        profile: user.profile,
        stats: user.stats,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

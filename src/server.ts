import express from 'express';
import cors from 'cors';

import { env } from './lib/env';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { meRouter } from './routes/me';
import { errorHandler } from './routes/_errorHandler';
import { adminRouter } from './routes/admin';
import gamesRouter from './routes/games';
import { wordsRouter } from './routes/words';

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim());
        if (allowed.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/content', contentRouter);
  app.use('/me', meRouter);
  app.use('/admin', adminRouter);
  app.use('/games', gamesRouter);
  app.use('/words', wordsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}

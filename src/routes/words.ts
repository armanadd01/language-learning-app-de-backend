import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/requireAuth';
import { HttpError } from '../lib/httpErrors';
import { WordModel } from '../models/Word';

export const wordsRouter = Router();

wordsRouter.get('/random', requireAuth, async (req, res, next) => {
  try {
    const count = z.coerce.number().int().min(1).max(100).default(10).parse(req.query.count);

    const docs = await WordModel.aggregate([{ $sample: { size: count } }, { $project: { _id: 0, word: 1 } }]);
    res.json({ words: docs.map((d: any) => d.word).filter(Boolean) });
  } catch (err) {
    next(err);
  }
});

wordsRouter.get('/search', requireAuth, async (req, res, next) => {
  try {
    const q = z.string().min(1).parse(req.query.q);
    const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);

    const normalized = q.trim().toLowerCase();
    if (!normalized) throw new HttpError(400, 'Missing q');

    const docs = await WordModel.find({ normalized: { $regex: `^${escapeRegex(normalized)}` } })
      .select({ _id: 0, word: 1 })
      .limit(limit);

    res.json({ words: docs.map((d) => d.word) });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

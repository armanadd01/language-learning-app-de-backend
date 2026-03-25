import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, requireAdmin } from '../middleware/requireAuth';
import { LevelModel } from '../models/Level';
import { ModuleModel } from '../models/Module';
import { LessonModel } from '../models/Lesson';
import { ActivityModel } from '../models/Activity';
import { assertFound } from '../lib/httpErrors';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// Lists
adminRouter.get('/levels', async (req, res, next) => {
  try {
    const courseSlug = z.string().default('german-goethe').parse(req.query.courseSlug);
    const levels = await LevelModel.find({ courseSlug }).sort({ order: 1 });
    res.json({ levels });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/modules', async (req, res, next) => {
  try {
    const levelId = z.string().min(1).parse(req.query.levelId);
    const modules = await ModuleModel.find({ levelId }).sort({ order: 1 });
    res.json({ modules });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/lessons', async (req, res, next) => {
  try {
    const moduleId = z.string().min(1).parse(req.query.moduleId);
    const lessons = await LessonModel.find({ moduleId }).sort({ order: 1 });
    res.json({ lessons });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/activities', async (req, res, next) => {
  try {
    const query = z
      .object({
        parentType: z.enum(['lesson', 'module']),
        parentId: z.string().min(1),
      })
      .parse(req.query);

    const activities = await ActivityModel.find({ parentType: query.parentType, parentId: query.parentId }).sort({ order: 1 });
    res.json({ activities });
  } catch (err) {
    next(err);
  }
});

// Levels
adminRouter.post('/levels', async (req, res, next) => {
  try {
    const body = z
      .object({
        courseSlug: z.string().min(1).default('german-goethe'),
        code: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
        order: z.number().int().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
      })
      .parse(req.body);

    const level = await LevelModel.create(body);
    res.json({ level });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/levels/:levelId', async (req, res, next) => {
  try {
    const { levelId } = z.object({ levelId: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        order: z.number().int().min(1).optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
      })
      .parse(req.body);

    const level = await LevelModel.findByIdAndUpdate(levelId, { $set: body }, { new: true });
    assertFound(level, 'Level not found');
    res.json({ level });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/levels/:levelId', async (req, res, next) => {
  try {
    const { levelId } = z.object({ levelId: z.string().min(1) }).parse(req.params);
    const level = await LevelModel.findByIdAndDelete(levelId);
    assertFound(level, 'Level not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Modules
adminRouter.post('/modules', async (req, res, next) => {
  try {
    const body = z
      .object({
        levelId: z.string().min(1),
        order: z.number().int().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
      })
      .parse(req.body);

    const moduleDoc = await ModuleModel.create(body);
    res.json({ module: moduleDoc });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/modules/:moduleId', async (req, res, next) => {
  try {
    const { moduleId } = z.object({ moduleId: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        order: z.number().int().min(1).optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const moduleDoc = await ModuleModel.findByIdAndUpdate(moduleId, { $set: body }, { new: true });
    assertFound(moduleDoc, 'Module not found');
    res.json({ module: moduleDoc });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/modules/:moduleId', async (req, res, next) => {
  try {
    const { moduleId } = z.object({ moduleId: z.string().min(1) }).parse(req.params);
    const moduleDoc = await ModuleModel.findByIdAndDelete(moduleId);
    assertFound(moduleDoc, 'Module not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Lessons
adminRouter.post('/lessons', async (req, res, next) => {
  try {
    const body = z
      .object({
        moduleId: z.string().min(1),
        order: z.number().int().min(1),
        title: z.string().min(1),
        objectives: z.array(z.string()).default([]),
        contentBlocks: z.array(z.any()).default([]),
      })
      .parse(req.body);

    const lesson = await LessonModel.create({
      ...body,
      contentBlocks: body.contentBlocks as any,
    });
    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/lessons/:lessonId', async (req, res, next) => {
  try {
    const { lessonId } = z.object({ lessonId: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        order: z.number().int().min(1).optional(),
        title: z.string().min(1).optional(),
        objectives: z.array(z.string()).optional(),
        contentBlocks: z.array(z.any()).optional(),
      })
      .parse(req.body);

    const update: Record<string, unknown> = { ...body };
    if (body.contentBlocks) update.contentBlocks = body.contentBlocks as any;

    const lesson = await LessonModel.findByIdAndUpdate(lessonId, { $set: update }, { new: true });
    assertFound(lesson, 'Lesson not found');
    res.json({ lesson });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/lessons/:lessonId', async (req, res, next) => {
  try {
    const { lessonId } = z.object({ lessonId: z.string().min(1) }).parse(req.params);
    const lesson = await LessonModel.findByIdAndDelete(lessonId);
    assertFound(lesson, 'Lesson not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Activities
adminRouter.post('/activities', async (req, res, next) => {
  try {
    const body = z
      .object({
        parentType: z.enum(['lesson', 'module']),
        parentId: z.string().min(1),
        order: z.number().int().min(1),
        type: z.enum(['find_article']),
        prompt: z.string().min(1),
        payload: z.unknown(),
        scoring: z.object({ xpCorrect: z.number().int().min(0), xpIncorrect: z.number().int().min(0) }).optional(),
      })
      .parse(req.body);

    const activity = await ActivityModel.create({
      ...body,
      scoring: body.scoring ?? { xpCorrect: 10, xpIncorrect: 2 },
    });

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/activities/:activityId', async (req, res, next) => {
  try {
    const { activityId } = z.object({ activityId: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        order: z.number().int().min(1).optional(),
        prompt: z.string().min(1).optional(),
        payload: z.unknown().optional(),
        scoring: z.object({ xpCorrect: z.number().int().min(0), xpIncorrect: z.number().int().min(0) }).optional(),
      })
      .parse(req.body);

    const activity = await ActivityModel.findByIdAndUpdate(activityId, { $set: body }, { new: true });
    assertFound(activity, 'Activity not found');
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/activities/:activityId', async (req, res, next) => {
  try {
    const { activityId } = z.object({ activityId: z.string().min(1) }).parse(req.params);
    const activity = await ActivityModel.findByIdAndDelete(activityId);
    assertFound(activity, 'Activity not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { ProgressionService } from '../lib/progressionService';
import { LevelModel } from '../models/Level';
import { ModuleModel } from '../models/Module';
import { LessonModel } from '../models/Lesson';
import { ActivityModel } from '../models/Activity';
import { AttemptModel } from '../models/Attempt';
import { UserModel } from '../models/User';
import { GrammarModel } from '../models/Grammar';
import { HttpError } from '../lib/httpErrors';

export const contentRouter = Router();

// More specific routes first to avoid conflicts
contentRouter.get('/grammar', requireAuth, async (req, res, next) => {
  try {
    const slug = z.string().default('german').parse(req.query.slug);
    const doc = await GrammarModel.findOne({ slug });
    if (!doc) throw new HttpError(404, 'Grammar not found');
    res.json({ grammar: doc });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/lessons/:lessonId', requireAuth, async (req, res, next) => {
  try {
    const { lessonId } = z.object({ lessonId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;

    // Validate lessonId format
    if (!lessonId || lessonId === 'undefined' || lessonId === 'null') {
      throw new HttpError(400, 'Invalid lesson ID format');
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) throw new HttpError(404, 'Lesson not found');

    const module = await ModuleModel.findById(lesson.moduleId);
    if (!module) throw new HttpError(404, 'Module not found');
    
    const level = await LevelModel.findById(module.levelId);
    if (!level) throw new HttpError(404, 'Level not found');

    // Check if user can access this lesson
    const canAccess = await ProgressionService.canAccessLesson(userId, level.courseSlug, lessonId);
    if (!canAccess) {
      throw new HttpError(403, 'Lesson not unlocked yet. Complete previous lessons to unlock.');
    }

    const activities = await ActivityModel.find({ parentType: 'lesson', parentId: lesson._id }).sort({ order: 1 });
    const progress = await ProgressionService.getUserProgress(userId, level.courseSlug);

    res.json({ 
      lesson: {
        ...lesson.toObject(),
        status: ProgressionService.getAccessStatus(progress, 'lesson', lesson._id.toString())
      }, 
      activities 
    });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/activities/random', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const courseSlug = z.string().default('german-goethe').parse(req.query.courseSlug);
    const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);

    // Grab a pool and pick a random accessible one. This avoids a full collection scan.
    const pool = await ActivityModel.find({ parentType: 'lesson' }).sort({ createdAt: -1 }).limit(limit);
    if (!pool.length) throw new HttpError(404, 'No activities found');

    const candidates = [...pool];
    while (candidates.length) {
      const idx = Math.floor(Math.random() * candidates.length);
      const a = candidates.splice(idx, 1)[0];
      const canAccess = await ProgressionService.canAccessLesson(userId, courseSlug, a.parentId.toString());
      if (canAccess) {
        res.json({ activity: a });
        return;
      }
    }

    throw new HttpError(404, 'No accessible activities found');
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/activities/:activityId', requireAuth, async (req, res, next) => {
  try {
    const { activityId } = z.object({ activityId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;
    
    // Validate activityId format
    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      throw new HttpError(400, 'Invalid activity ID format');
    }
    
    const activity = await ActivityModel.findById(activityId);
    if (!activity) throw new HttpError(404, 'Activity not found');
    
    // Check if user can access the parent lesson
    if (activity.parentType === 'lesson') {
      const canAccess = await ProgressionService.canAccessLesson(userId, 'german-goethe', activity.parentId.toString());
      if (!canAccess) {
        throw new HttpError(403, 'Activity not unlocked yet. Complete the lesson first.');
      }
    }
    
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/levels', requireAuth, async (req, res, next) => {
  try {
    const courseSlug = z.string().default('german-goethe').parse(req.query.courseSlug);
    const userId = (req as any).user.id;
    
    const levels = await LevelModel.find({ courseSlug }).sort({ order: 1 });
    
    // If no levels exist, return empty array instead of trying to initialize progress
    if (levels.length === 0) {
      return res.json({ levels: [] });
    }
    
    const progress = await ProgressionService.getUserProgress(userId, courseSlug);
    
    const levelsWithStatus = levels.map(level => ({
      ...level.toObject(),
      status: ProgressionService.getAccessStatus(progress, 'level', level._id.toString()),
      isCurrent: progress.currentLevelId === level._id.toString()
    }));
    
    res.json({ levels: levelsWithStatus });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/levels/:levelId/modules', requireAuth, async (req, res, next) => {
  try {
    const { levelId } = z.object({ levelId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;
    
    // Check if user can access this level
    const level = await LevelModel.findById(levelId);
    if (!level) throw new HttpError(404, 'Level not found');
    
    const canAccess = await ProgressionService.canAccessLevel(userId, level.courseSlug, levelId);
    if (!canAccess) {
      throw new HttpError(403, 'Level not unlocked yet. Complete previous lessons to unlock.');
    }
    
    const modules = await ModuleModel.find({ levelId }).sort({ order: 1 });
    const progress = await ProgressionService.getUserProgress(userId, level.courseSlug);
    
    const modulesWithStatus = modules.map(module => ({
      ...module.toObject(),
      status: ProgressionService.getAccessStatus(progress, 'module', module._id.toString()),
      isCurrent: progress.currentModuleId === module._id.toString()
    }));
    
    res.json({ modules: modulesWithStatus });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/modules/:moduleId', requireAuth, async (req, res, next) => {
  try {
    const { moduleId } = z.object({ moduleId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;

    const module = await ModuleModel.findById(moduleId);
    if (!module) throw new HttpError(404, 'Module not found');

    const level = await LevelModel.findById(module.levelId);
    if (!level) throw new HttpError(404, 'Level not found');

    const canAccess = await ProgressionService.canAccessModule(userId, level.courseSlug, moduleId);
    if (!canAccess) {
      throw new HttpError(403, 'Module not unlocked yet. Complete previous lessons to unlock.');
    }

    const progress = await ProgressionService.getUserProgress(userId, level.courseSlug);

    res.json({
      module: {
        ...module.toObject(),
        status: ProgressionService.getAccessStatus(progress, 'module', module._id.toString()),
        isCurrent: progress.currentModuleId === module._id.toString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

contentRouter.get('/modules/:moduleId/lessons', requireAuth, async (req, res, next) => {
  try {
    const { moduleId } = z.object({ moduleId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;
    
    // Check if user can access this module
    const module = await ModuleModel.findById(moduleId);
    if (!module) throw new HttpError(404, 'Module not found');
    
    const level = await LevelModel.findById(module.levelId);
    if (!level) throw new HttpError(404, 'Level not found');
    
    const canAccess = await ProgressionService.canAccessModule(userId, level.courseSlug, moduleId);
    if (!canAccess) {
      throw new HttpError(403, 'Module not unlocked yet. Complete previous lessons to unlock.');
    }
    
    const lessons = await LessonModel.find({ moduleId }).sort({ order: 1 });
    const progress = await ProgressionService.getUserProgress(userId, level.courseSlug);
    
    const lessonsWithStatus = lessons.map(lesson => ({
      ...lesson.toObject(),
      status: ProgressionService.getAccessStatus(progress, 'lesson', lesson._id.toString()),
      isCurrent: progress.currentLessonId === lesson._id.toString()
    }));
    
    res.json({ lessons: lessonsWithStatus });
  } catch (err) {
    next(err);
  }
});

contentRouter.post('/activities/:activityId/submit', requireAuth, async (req, res, next) => {
  try {
    const { activityId } = z.object({ activityId: z.string().min(1) }).parse(req.params);
    const { selections } = z.object({ 
      selections: z.array(z.object({ 
        index: z.number(), 
        answer: z.string() 
      }))
    }).parse(req.body);
    const userId = (req as any).user.id;
    
    // Validate activityId format
    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      throw new HttpError(400, 'Invalid activity ID format');
    }
    
    const activity = await ActivityModel.findById(activityId);
    if (!activity) throw new HttpError(404, 'Activity not found');
    
    // Check if user can access the parent lesson
    if (activity.parentType === 'lesson') {
      const canAccess = await ProgressionService.canAccessLesson(userId, 'german-goethe', activity.parentId.toString());
      if (!canAccess) {
        throw new HttpError(403, 'Activity not unlocked yet. Complete the lesson first.');
      }
    }
    
    // Calculate results based on activity type
    let correctCount = 0;
    const totalItems = (activity.payload as any).items.length;
    
    if (activity.type === 'find_article') {
      const items = (activity.payload as any).items as Array<{ noun: string; correct: string; distractors: string[] }>;
      correctCount = selections.reduce((count, selection) => {
        const item = items[selection.index];
        return item && selection.answer === item.correct ? count + 1 : count;
      }, 0);
    } else if (activity.type === 'alphabet_recognition') {
      const items = (activity.payload as any).items as Array<{ letter: string; example: string; options: string[] }>;
      correctCount = selections.reduce((count, selection) => {
        const item = items[selection.index];
        return item && selection.answer === item.example ? count + 1 : count;
      }, 0);
    } else if (activity.type === 'case_identification') {
      const items = (activity.payload as any).items as Array<{ sentence: string; case: string; options: string[] }>;
      correctCount = selections.reduce((count, selection) => {
        const item = items[selection.index];
        return item && selection.answer === item.case ? count + 1 : count;
      }, 0);
    } else if (activity.type === 'preposition_cases') {
      const items = (activity.payload as any).items as Array<{ preposition: string; case: string; options: string[] }>;
      correctCount = selections.reduce((count, selection) => {
        const item = items[selection.index];
        return item && selection.answer === item.case ? count + 1 : count;
      }, 0);
    }
    
    // Calculate XP based on scoring config or default
    const scoring = activity.scoring || { xpCorrect: 10, xpIncorrect: 2 };
    const xpEarned = correctCount * scoring.xpCorrect + (totalItems - correctCount) * scoring.xpIncorrect;
    
    // Check if this is the last activity in the lesson and complete the lesson
    let lessonCompleted = false;
    if (activity.parentType === 'lesson') {
      const allActivities = await ActivityModel.find({ 
        parentType: 'lesson', 
        parentId: activity.parentId 
      }).sort({ order: 1 });
      
      const isLastActivity = allActivities[allActivities.length - 1]?._id.toString() === activityId;
      
      if (isLastActivity && correctCount >= totalItems * 0.8) { // 80% pass rate
        try {
          await ProgressionService.completeLesson(userId, 'german-goethe', activity.parentId.toString());
          lessonCompleted = true;
        } catch (err) {
          // Log error but don't fail the submission
          console.error('Failed to complete lesson:', err);
        }
      }
    }
    
    const safeXp = Math.max(0, xpEarned);

    await AttemptModel.create({
      userId,
      activityId: activity._id,
      answers: { selections },
      result: { correctCount, total: totalItems, xpEarned: safeXp },
    });

    const user = await UserModel.findById(userId);
    if (user) {
      user.stats.xpTotal += safeXp;

      const now = new Date();
      const last = user.stats.lastActivityAt;
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!last) {
        user.stats.streakDays = Math.max(1, user.stats.streakDays ?? 0);
      } else {
        const diffDays = Math.floor(
          (startOfDay(now).getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) user.stats.streakDays += 1;
        else if (diffDays > 1) user.stats.streakDays = 1;
      }

      user.stats.lastActivityAt = now;
      await user.save();
    }

    res.json({
      result: {
        correctCount,
        total: totalItems,
        xpEarned: safeXp,
        lessonCompleted,
      },
      ...(user ? { stats: user.stats } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// New endpoint to complete a lesson and unlock next content
contentRouter.post('/lessons/:lessonId/complete', requireAuth, async (req, res, next) => {
  try {
    const { lessonId } = z.object({ lessonId: z.string().min(1) }).parse(req.params);
    const userId = (req as any).user.id;
    
    const progress = await ProgressionService.completeLesson(userId, 'german-goethe', lessonId);
    
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

// New endpoint to get user's overall progress
contentRouter.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const courseSlug = z.string().default('german-goethe').parse(req.query.courseSlug);
    
    const progress = await ProgressionService.getUserProgress(userId, courseSlug);
    
    res.json({ progress });
  } catch (err) {
    next(err);
  }
});

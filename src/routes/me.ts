import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, AuthedRequest } from '../middleware/requireAuth';
import { ActivityModel, FindArticlePayload } from '../models/Activity';
import { AttemptModel } from '../models/Attempt';
import { ProgressModel } from '../models/Progress';
import { UserModel } from '../models/User';
import { HttpError } from '../lib/httpErrors';

export const meRouter = Router();

meRouter.get('/stats', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ stats: user.stats });
  } catch (err) {
    next(err);
  }
});

meRouter.put('/profile', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const body = z
      .object({
        displayName: z.string().min(1).max(60).optional(),
        nativeLanguage: z.string().min(1).max(32).optional(),
        targetLanguage: z.string().min(1).max(32).optional(),
        bio: z.string().max(250).optional(),
        currentLevelCode: z.string().min(1).max(4).optional(),
      })
      .parse(req.body);

    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(404, 'User not found');

    user.profile = {
      ...(user.profile ?? {}),
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.nativeLanguage !== undefined ? { nativeLanguage: body.nativeLanguage } : {}),
      ...(body.targetLanguage !== undefined ? { targetLanguage: body.targetLanguage } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.currentLevelCode !== undefined ? { currentLevelCode: body.currentLevelCode } : {}),
    } as any;

    await user.save();

    res.json({ profile: user.profile });
  } catch (err) {
    next(err);
  }
});

meRouter.get('/summary', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(404, 'User not found');

    const courseSlug = z.string().default('german-goethe').parse(req.query.courseSlug);
    const progress = await ProgressModel.findOne({ userId: String(user._id), courseSlug });

    const recentAttempts = await AttemptModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate({ path: 'activityId', select: 'type prompt parentType parentId order' });

    const xpTotal = user.stats.xpTotal ?? 0;
    const streakDays = user.stats.streakDays ?? 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const xpToday = recentAttempts
      .filter((a) => a.createdAt && a.createdAt >= todayStart)
      .reduce((sum, a) => sum + (a.result?.xpEarned ?? 0), 0);

    const attemptTotals = recentAttempts.reduce(
      (acc, a) => {
        acc.correct += a.result?.correctCount ?? 0;
        acc.total += a.result?.total ?? 0;
        return acc;
      },
      { correct: 0, total: 0 }
    );
    const avgAccuracy = attemptTotals.total > 0 ? attemptTotals.correct / attemptTotals.total : null;

    const badges = [
      { id: 'first-steps', title: 'First Steps', description: 'Earn your first XP', earned: xpTotal > 0 },
      { id: 'xp-1000', title: 'XP Collector', description: 'Reach 1,000 XP total', earned: xpTotal >= 1000 },
      { id: 'streak-7', title: 'Consistent Learner', description: 'Maintain a 7-day streak', earned: streakDays >= 7 },
      { id: 'streak-30', title: 'Unstoppable', description: 'Maintain a 30-day streak', earned: streakDays >= 30 },
    ];

    res.json({
      stats: user.stats,
      progress: progress
        ? {
            currentLevelId: progress.currentLevelId ?? null,
            currentModuleId: progress.currentModuleId ?? null,
            currentLessonId: progress.currentLessonId ?? null,
            unlockedLevelsCount: (progress.unlockedLevels ?? []).length,
            unlockedModulesCount: (progress.unlockedModules ?? []).length,
            unlockedLessonsCount: (progress.unlockedLessons ?? []).length,
            completedLessonsCount: (progress.completedLessons ?? []).length,
            completedActivitiesCount: (progress.completedActivities ?? []).length,
            overallProgress: progress.overallProgress ?? 0,
          }
        : null,
      metrics: {
        xpToday,
        avgAccuracy,
      },
      badges: badges.filter((b) => b.earned),
      recent: recentAttempts.map((a) => ({
        id: String(a._id),
        createdAt: a.createdAt,
        xpEarned: a.result?.xpEarned ?? 0,
        correctCount: a.result?.correctCount ?? 0,
        total: a.result?.total ?? 0,
        activity: a.activityId && typeof a.activityId === 'object' ? {
          id: String((a.activityId as any)._id),
          type: (a.activityId as any).type,
          prompt: (a.activityId as any).prompt,
          order: (a.activityId as any).order,
          parentType: (a.activityId as any).parentType,
          parentId: String((a.activityId as any).parentId),
        } : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

meRouter.post('/activities/:activityId/submit', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { activityId } = z.object({ activityId: z.string().min(1) }).parse(req.params);

    const body = z
      .object({
        answers: z.unknown(),
        durationMs: z.number().int().positive().optional(),
      })
      .parse(req.body);

    const activity = await ActivityModel.findById(activityId);
    if (!activity) throw new HttpError(404, 'Activity not found');

    if (activity.type !== 'find_article') throw new HttpError(400, 'Unsupported activity type');

    const payload = activity.payload as FindArticlePayload;
    const submitted = z
      .object({
        selections: z.array(z.object({ index: z.number().int().min(0), article: z.enum(['der', 'die', 'das']) })),
      })
      .parse(body.answers);

    let correctCount = 0;
    for (const sel of submitted.selections) {
      const item = payload.items[sel.index];
      if (!item) continue;
      if (sel.article === item.correct) correctCount += 1;
    }

    const total = payload.items.length;
    const xpEarned = correctCount * activity.scoring.xpCorrect + (total - correctCount) * activity.scoring.xpIncorrect;

    await AttemptModel.create({
      userId: req.user!.id,
      activityId: activity._id,
      answers: submitted,
      result: { correctCount, total, xpEarned },
      durationMs: body.durationMs,
    });

    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(404, 'User not found');

    user.stats.xpTotal += xpEarned;

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

    res.json({
      result: { correctCount, total, xpEarned },
      stats: user.stats,
    });
  } catch (err) {
    next(err);
  }
});

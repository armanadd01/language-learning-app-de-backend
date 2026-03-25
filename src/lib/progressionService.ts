import { ProgressModel, UserProgress } from '../models/Progress';
import { LevelModel } from '../models/Level';
import { ModuleModel } from '../models/Module';
import { LessonModel } from '../models/Lesson';
import { HttpError } from './httpErrors';

export class ProgressionService {
  static async getUserProgress(userId: string, courseSlug: string): Promise<UserProgress> {
    let progress = await ProgressModel.findOne({ userId, courseSlug });
    
    if (!progress) {
      // Initialize progress for new user
      const firstLevel = await LevelModel.findOne({ courseSlug }).sort({ order: 1 });
      if (!firstLevel) throw new HttpError(404, 'No levels found for course');

      try {
        progress = await ProgressModel.create({
          userId,
          courseSlug,
          currentLevelId: firstLevel._id.toString(),
          unlockedLevels: [firstLevel._id.toString()],
          overallProgress: 0,
        });
      } catch (error: any) {
        // Handle duplicate key error - fetch the existing record
        if (error.code === 11000) {
          progress = await ProgressModel.findOne({ userId, courseSlug });
          if (!progress) {
            throw new HttpError(500, 'Failed to create or fetch progress record');
          }
        } else {
          throw error;
        }
      }

      // Only initialize modules and lessons if we successfully created the progress record
      if (progress && progress.unlockedModules.length === 0) {
        // Unlock first module of first level
        const firstModule = await ModuleModel.findOne({ levelId: firstLevel._id }).sort({ order: 1 });
        if (firstModule) {
          progress.unlockedModules.push(firstModule._id.toString());
          progress.currentModuleId = firstModule._id.toString();

          // Unlock first lesson of first module
          const firstLesson = await LessonModel.findOne({ moduleId: firstModule._id }).sort({ order: 1 });
          if (firstLesson) {
            progress.unlockedLessons.push(firstLesson._id.toString());
            progress.currentLessonId = firstLesson._id.toString();
          }
        }

        await progress.save();
      }
    }

    return progress;
  }

  static async canAccessLevel(userId: string, courseSlug: string, levelId: string): Promise<boolean> {
    const progress = await this.getUserProgress(userId, courseSlug);
    return progress.unlockedLevels.includes(levelId);
  }

  static async canAccessModule(userId: string, courseSlug: string, moduleId: string): Promise<boolean> {
    const progress = await this.getUserProgress(userId, courseSlug);
    return progress.unlockedModules.includes(moduleId);
  }

  static async canAccessLesson(userId: string, courseSlug: string, lessonId: string): Promise<boolean> {
    const progress = await this.getUserProgress(userId, courseSlug);
    return progress.unlockedLessons.includes(lessonId);
  }

  static async completeLesson(userId: string, courseSlug: string, lessonId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId, courseSlug);
    
    if (!progress.unlockedLessons.includes(lessonId)) {
      throw new HttpError(403, 'Lesson not unlocked');
    }

    // Mark lesson as completed
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // Get lesson details to unlock next content
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) throw new HttpError(404, 'Lesson not found');

    const module = await ModuleModel.findById(lesson.moduleId);
    if (!module) throw new HttpError(404, 'Module not found');

    // Unlock next lesson in the same module
    const nextLesson = await LessonModel.findOne({ 
      moduleId: lesson.moduleId, 
      order: lesson.order + 1 
    }).sort({ order: 1 });

    if (nextLesson && !progress.unlockedLessons.includes(nextLesson._id.toString())) {
      progress.unlockedLessons.push(nextLesson._id.toString());
      progress.currentLessonId = nextLesson._id.toString();
    }

    // If all lessons in module are completed, unlock next module
    const allLessonsInModule = await LessonModel.find({ moduleId: lesson.moduleId }).sort({ order: 1 });
    const allCompleted = allLessonsInModule.every(l => progress.completedLessons.includes(l._id.toString()));

    if (allCompleted) {
      const nextModule = await ModuleModel.findOne({ 
        levelId: module.levelId, 
        order: module.order + 1 
      }).sort({ order: 1 });

      if (nextModule && !progress.unlockedModules.includes(nextModule._id.toString())) {
        progress.unlockedModules.push(nextModule._id.toString());
        progress.currentModuleId = nextModule._id.toString();

        // Unlock first lesson of next module
        const firstLessonOfNextModule = await LessonModel.findOne({ 
          moduleId: nextModule._id 
        }).sort({ order: 1 });

        if (firstLessonOfNextModule) {
          progress.unlockedLessons.push(firstLessonOfNextModule._id.toString());
          progress.currentLessonId = firstLessonOfNextModule._id.toString();
        }
      }

      // If all modules in level are completed, unlock next level
      const allModulesInLevel = await ModuleModel.find({ levelId: module.levelId }).sort({ order: 1 });
      const allModulesCompleted = await (async () => {
        if (!allModulesInLevel.length) return false;
        const moduleIds = allModulesInLevel.map((m) => m._id);
        const lessonsInLevel = await LessonModel.find({ moduleId: { $in: moduleIds } }).select('_id moduleId');
        return allModulesInLevel.every((m) => {
          const moduleLessons = lessonsInLevel.filter((l) => l.moduleId.toString() === m._id.toString());
          // If a module has no lessons, don't treat it as completed.
          if (!moduleLessons.length) return false;
          return moduleLessons.every((l) => progress.completedLessons.includes(l._id.toString()));
        });
      })();

      if (allModulesCompleted) {
        const currentLevel = await LevelModel.findById(module.levelId);
        if (!currentLevel) throw new HttpError(404, 'Level not found');

        const nextLevel = await LevelModel.findOne({
          courseSlug,
          order: currentLevel.order + 1,
        }).sort({ order: 1 });

        if (nextLevel && !progress.unlockedLevels.includes(nextLevel._id.toString())) {
          progress.unlockedLevels.push(nextLevel._id.toString());
          progress.currentLevelId = nextLevel._id.toString();
        }
      }
    }

    // Calculate overall progress
    const totalLevels = await LevelModel.countDocuments({ courseSlug });
    const totalModules = await ModuleModel.countDocuments();
    const totalLessons = await LessonModel.countDocuments();
    
    const completedLevels = progress.unlockedLevels.length;
    const completedModules = progress.unlockedModules.length;
    const completedLessonsCount = progress.completedLessons.length;
    
    progress.overallProgress = Math.round(
      ((completedLevels / totalLevels) * 0.2 + 
       (completedModules / totalModules) * 0.3 + 
       (completedLessonsCount / totalLessons) * 0.5) * 100
    );

    await progress.save();
    return progress;
  }

  static getAccessStatus(
    progress: UserProgress, 
    itemType: 'level' | 'module' | 'lesson', 
    itemId: string
  ): 'locked' | 'available' | 'completed' {
    const unlockedArray = itemType === 'level' ? progress.unlockedLevels :
                        itemType === 'module' ? progress.unlockedModules :
                        progress.unlockedLessons;
    const completedArray = itemType === 'lesson' ? progress.completedLessons : [];

    if (!unlockedArray.includes(itemId)) return 'locked';
    if (completedArray.includes(itemId)) return 'completed';
    return 'available';
  }
}

import mongoose, { Schema } from 'mongoose';

export type ProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed';

const progressSchema = new Schema({
  userId: { type: String, required: true, index: true },
  courseSlug: { type: String, required: true },
  currentLevelId: { type: String },
  currentModuleId: { type: String },
  currentLessonId: { type: String },
  unlockedLevels: { type: [String], required: true, default: [] },
  unlockedModules: { type: [String], required: true, default: [] },
  unlockedLessons: { type: [String], required: true, default: [] },
  completedLessons: { type: [String], required: true, default: [] },
  completedActivities: { type: [String], required: true, default: [] },
  overallProgress: { type: Number, required: true, default: 0, min: 0, max: 100 },
}, { timestamps: true });

progressSchema.index({ userId: 1, courseSlug: 1 }, { unique: true });

export const ProgressModel = mongoose.model('Progress', progressSchema);

export type UserProgress = typeof ProgressModel.prototype;

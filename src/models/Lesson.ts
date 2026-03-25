import mongoose, { Schema, Types } from 'mongoose';

export type LessonContentBlock =
  | { type: 'text'; text: string }
  | { type: 'example'; de: string; en?: string }
  | { type: 'tip'; text: string };

export type LessonDoc = {
  moduleId: Types.ObjectId;
  order: number;
  title: string;
  objectives: string[];
  contentBlocks: LessonContentBlock[];
  createdAt: Date;
  updatedAt: Date;
};

const lessonSchema = new Schema<LessonDoc>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: { type: [String], required: true, default: [] },
    contentBlocks: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
  },
  { timestamps: true }
);

lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export const LessonModel = mongoose.model<LessonDoc>('Lesson', lessonSchema);

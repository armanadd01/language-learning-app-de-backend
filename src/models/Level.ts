import mongoose, { Schema, Types } from 'mongoose';

export type LevelCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type LevelDoc = {
  courseSlug: string;
  code: LevelCode;
  order: number;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

const levelSchema = new Schema<LevelDoc>(
  {
    courseSlug: { type: String, required: true, index: true },
    code: { type: String, required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

levelSchema.index({ courseSlug: 1, code: 1 }, { unique: true });

export const LevelModel = mongoose.model<LevelDoc>('Level', levelSchema);

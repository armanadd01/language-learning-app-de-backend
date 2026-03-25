import mongoose, { Schema, Types } from 'mongoose';

export type AttemptDoc = {
  userId: Types.ObjectId;
  activityId?: Types.ObjectId | null;
  answers: unknown;
  result: {
    correctCount: number;
    total: number;
    xpEarned: number;
  };
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
};

const attemptSchema = new Schema<AttemptDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: false, index: true },
    answers: { type: Schema.Types.Mixed, required: true },
    result: {
      correctCount: { type: Number, required: true },
      total: { type: Number, required: true },
      xpEarned: { type: Number, required: true },
    },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

export const AttemptModel = mongoose.model<AttemptDoc>('Attempt', attemptSchema);

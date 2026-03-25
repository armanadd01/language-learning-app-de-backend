import mongoose, { Schema, Types } from 'mongoose';

export type ActivityType = 'find_article';

export type FindArticlePayload = {
  items: Array<{
    noun: string;
    correct: 'der' | 'die' | 'das';
    distractors: Array<'der' | 'die' | 'das'>;
  }>;
};

export type ActivityDoc = {
  parentType: 'lesson' | 'module';
  parentId: Types.ObjectId;
  order: number;
  type: ActivityType;
  prompt: string;
  payload: unknown;
  scoring: {
    xpCorrect: number;
    xpIncorrect: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

const activitySchema = new Schema<ActivityDoc>(
  {
    parentType: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, required: true, index: true },
    order: { type: Number, required: true },
    type: { type: String, required: true },
    prompt: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    scoring: {
      xpCorrect: { type: Number, required: true, default: 10 },
      xpIncorrect: { type: Number, required: true, default: 2 },
    },
  },
  { timestamps: true }
);

activitySchema.index({ parentType: 1, parentId: 1, order: 1 }, { unique: true });

export const ActivityModel = mongoose.model<ActivityDoc>('Activity', activitySchema);

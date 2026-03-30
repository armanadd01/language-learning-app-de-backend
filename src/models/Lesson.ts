import mongoose, { Schema, Types } from 'mongoose';

export type LessonContentBlock =
  | { type: 'text'; text: string }
  | { type: 'example'; de: string; en?: string }
  | { type: 'tip'; text: string };

export type LessonExercise = Record<string, unknown>;
export type LessonVocabItem = Record<string, unknown>;
export type LessonGrammarRule = Record<string, unknown>;
export type LessonExample = Record<string, unknown>;

export type LessonDoc = {
  externalId?: string;
  moduleId: Types.ObjectId;
  order: number;
  title: string;
  objectives: string[];
  contentBlocks: LessonContentBlock[];
  vocabulary: LessonVocabItem[];
  grammarRules: LessonGrammarRule[];
  examples: LessonExample[];
  exercises: LessonExercise[];
  estimatedDurationMin?: number;
  difficulty?: string;
  xp?: number;
  coins?: number;
  contentSeed?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const lessonSchema = new Schema<LessonDoc>(
  {
    externalId: { type: String, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    objectives: { type: [String], required: true, default: [] },
    contentBlocks: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
    vocabulary: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
    grammarRules: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
    examples: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
    exercises: ({ type: [Schema.Types.Mixed], required: true, default: [] } as unknown as Record<string, unknown>),
    estimatedDurationMin: { type: Number },
    difficulty: { type: String },
    xp: { type: Number },
    coins: { type: Number },
    contentSeed: ({ type: Schema.Types.Mixed } as unknown as Record<string, unknown>),
  },
  { timestamps: true }
);

lessonSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export const LessonModel = mongoose.model<LessonDoc>('Lesson', lessonSchema);

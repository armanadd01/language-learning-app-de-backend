import mongoose, { Schema, Types } from 'mongoose';

export type ModuleDoc = {
  levelId: Types.ObjectId;
  order: number;
  title: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

const moduleSchema = new Schema<ModuleDoc>(
  {
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    tags: { type: [String], required: true, default: [] },
  },
  { timestamps: true }
);

moduleSchema.index({ levelId: 1, order: 1 }, { unique: true });

export const ModuleModel = mongoose.model<ModuleDoc>('Module', moduleSchema);

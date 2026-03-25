import mongoose, { Schema } from 'mongoose';

export type WordDoc = {
  word: string;
  normalized: string;
  lang: 'de';
  createdAt: Date;
  updatedAt: Date;
};

const wordSchema = new Schema<WordDoc>(
  {
    word: { type: String, required: true },
    normalized: { type: String, required: true, index: true, unique: true },
    lang: { type: String, required: true, default: 'de' },
  },
  { timestamps: true }
);

wordSchema.index({ normalized: 1 }, { unique: true });

export const WordModel = mongoose.model<WordDoc>('Word', wordSchema);

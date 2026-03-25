import mongoose, { Schema } from 'mongoose';

export type DictionaryCacheDoc = {
  lang: string;
  word: string;
  normalized: string;
  phonetic?: string | null;
  audioUrl?: string | null;
  meanings?: Array<{
    partOfSpeech?: string | null;
    definitions: Array<{ definition?: string | null; example?: string | null }>;
  }>;
  sourceUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
};

const dictionaryCacheSchema = new Schema<DictionaryCacheDoc>(
  {
    lang: { type: String, required: true, default: 'de', index: true },
    word: { type: String, required: true },
    normalized: { type: String, required: true, index: true },
    phonetic: { type: String, default: null },
    audioUrl: { type: String, default: null },
    meanings: { type: Schema.Types.Mixed, default: [] },
    sourceUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

dictionaryCacheSchema.index({ lang: 1, normalized: 1 }, { unique: true });

export const DictionaryCacheModel = mongoose.model<DictionaryCacheDoc>('DictionaryCache', dictionaryCacheSchema);

import mongoose, { Schema } from "mongoose";

export type GrammarDoc = {
  slug: string;
  language: string;
  content: any;
  createdAt: Date;
  updatedAt: Date;
};

const grammarSchema = new Schema<GrammarDoc>(
  {
    slug: { type: String, required: true, index: true, unique: true },
    language: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const GrammarModel = mongoose.model<GrammarDoc>(
  "Grammar",
  grammarSchema,
);

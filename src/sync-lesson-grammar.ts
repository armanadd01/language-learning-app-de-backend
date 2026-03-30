import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
import path from 'path';

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LessonModel } from './models/Lesson';

type GeneratedLesson = {
  id: string;
  title: string;
  level_id: string;
  module_id: string;
  order: number;
  grammar_rules?: unknown[];
};

function readJsonFile<T>(absPath: string): T {
  return JSON.parse(fs.readFileSync(absPath, 'utf-8')) as T;
}

async function run() {
  await connectToDatabase(env.MONGODB_URI);

  const root = path.resolve(__dirname, '..', '..');
  const jsonDir = path.join(root, 'extracted_toc', 'generated_json');
  const lessonsPath = path.join(jsonDir, 'lessons.json');

  if (!fs.existsSync(lessonsPath)) {
    throw new Error(`Generated lessons.json not found at: ${lessonsPath}`);
  }

  const lessons = readJsonFile<GeneratedLesson[]>(lessonsPath);

  let patched = 0;
  let missing = 0;
  let emptyRules = 0;

  for (const les of lessons) {
    const rules = Array.isArray(les.grammar_rules) ? les.grammar_rules : [];
    if (rules.length === 0) emptyRules += 1;

    const doc = await LessonModel.findOne({ externalId: les.id });
    if (!doc) {
      missing += 1;
      continue;
    }

    await LessonModel.updateOne(
      { _id: doc._id },
      {
        $set: {
          grammarRules: rules,
        },
      }
    );

    patched += 1;
  }

  console.log(`✅ Grammar synced for lessons: ${patched}`);
  console.log(`⚠️  Lessons missing in Mongo (by externalId): ${missing}`);
  console.log(`ℹ️  Generated lessons with empty grammar_rules: ${emptyRules}`);
  console.log('🎉 Grammar sync complete.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

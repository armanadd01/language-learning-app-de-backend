import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
import path from 'path';

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { LevelModel } from './models/Level';
import { ModuleModel } from './models/Module';
import { LessonModel } from './models/Lesson';

type GeneratedLevel = {
  id: string;
  cefr: 'A0' | 'A1' | 'A2' | 'B1' | string;
  title: string;
  order: number;
  description?: string;
};

type GeneratedModule = {
  id: string;
  level_id: string;
  title: string;
  order: number;
  source?: string;
  module_code?: string;
};

type GeneratedLesson = {
  id: string;
  level_id: string;
  module_id: string;
  order: number;
  title: string;
  objectives: string[];
  vocabulary?: unknown[];
  grammar_rules?: unknown[];
  examples?: unknown[];
  exercises?: unknown[];
  estimated_duration_min?: number;
  difficulty?: string;
  xp?: number;
  coins?: number;
  content_seed?: Record<string, unknown>;
};

function readJsonFile<T>(absPath: string): T {
  return JSON.parse(fs.readFileSync(absPath, 'utf-8')) as T;
}

async function seedGeneratedCurriculum() {
  await connectToDatabase(env.MONGODB_URI);

  const courseSlug = 'german-goethe';

  const root = path.resolve(__dirname, '..', '..');
  const jsonDir = path.join(root, 'extracted_toc', 'generated_json');

  const levelsPath = path.join(jsonDir, 'levels.json');
  const modulesPath = path.join(jsonDir, 'modules.json');
  const lessonsPath = path.join(jsonDir, 'lessons.json');

  if (!fs.existsSync(levelsPath) || !fs.existsSync(modulesPath) || !fs.existsSync(lessonsPath)) {
    throw new Error(
      `Generated JSON not found. Expected:\n- ${levelsPath}\n- ${modulesPath}\n- ${lessonsPath}`
    );
  }

  const levels = readJsonFile<GeneratedLevel[]>(levelsPath);
  const modules = readJsonFile<GeneratedModule[]>(modulesPath);
  const lessons = readJsonFile<GeneratedLesson[]>(lessonsPath);

  // Levels
  const levelIdByExternalId = new Map<string, string>();
  for (const lvl of levels) {
    const code = String(lvl.cefr).toUpperCase();
    const doc = await LevelModel.findOneAndUpdate(
      { courseSlug, code },
      {
        $set: {
          externalId: lvl.id,
          courseSlug,
          code,
          order: lvl.order,
          title: lvl.title,
          description: lvl.description,
        },
      },
      { upsert: true, new: true }
    );
    levelIdByExternalId.set(lvl.id, doc._id.toString());
  }

  console.log(`✅ Upserted levels: ${levels.length}`);

  // Modules
  const moduleIdByExternalId = new Map<string, string>();
  for (const mod of modules) {
    const levelMongoId = levelIdByExternalId.get(mod.level_id);
    if (!levelMongoId) {
      throw new Error(`Module ${mod.id} references unknown level_id: ${mod.level_id}`);
    }

    const doc = await ModuleModel.findOneAndUpdate(
      { levelId: levelMongoId, order: mod.order },
      {
        $set: {
          externalId: mod.id,
          levelId: levelMongoId,
          order: mod.order,
          title: mod.title,
          description: undefined,
          tags: [],
        },
      },
      { upsert: true, new: true }
    );

    moduleIdByExternalId.set(mod.id, doc._id.toString());
  }

  console.log(`✅ Upserted modules: ${modules.length}`);

  // Lessons
  for (const les of lessons) {
    const moduleMongoId = moduleIdByExternalId.get(les.module_id);
    if (!moduleMongoId) {
      throw new Error(`Lesson ${les.id} references unknown module_id: ${les.module_id}`);
    }

    await LessonModel.findOneAndUpdate(
      { moduleId: moduleMongoId, order: les.order },
      {
        $set: {
          externalId: les.id,
          moduleId: moduleMongoId,
          order: les.order,
          title: les.title,
          objectives: les.objectives ?? [],
          contentBlocks: [],
          vocabulary: les.vocabulary ?? [],
          grammarRules: (les.grammar_rules ?? []) as unknown[],
          examples: les.examples ?? [],
          exercises: les.exercises ?? [],
          estimatedDurationMin: les.estimated_duration_min,
          difficulty: les.difficulty,
          xp: les.xp,
          coins: les.coins,
          contentSeed: les.content_seed ?? {},
        },
      },
      { upsert: true, new: true }
    );
  }

  console.log(`✅ Upserted lessons: ${lessons.length}`);
  console.log('🎉 Generated curriculum import complete.');
}

seedGeneratedCurriculum().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { GrammarModel } from './models/Grammar';

function resolveGrammarPath() {
  const arg = process.argv.find((a) => a.startsWith('--file='));
  if (arg) return arg.slice('--file='.length);
  const explicitIdx = process.argv.findIndex((a) => a === '--file' || a === '-f');
  if (explicitIdx >= 0 && process.argv[explicitIdx + 1]) return process.argv[explicitIdx + 1];
  return path.resolve(__dirname, '../../grammar/grammar.json');
}

async function main() {
  const filePath = resolveGrammarPath();
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Grammar file not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, 'utf8');
  const content = JSON.parse(raw) as any;

  const language = typeof content?.language === 'string' && content.language.trim().length ? content.language.trim() : 'German';
  const slug = 'german';

  await connectToDatabase(env.MONGODB_URI);

  await GrammarModel.updateOne(
    { slug },
    {
      $set: {
        slug,
        language,
        content,
      },
    },
    { upsert: true }
  );

  // eslint-disable-next-line no-console
  console.log(`Grammar upserted: slug=${slug} language=${language}`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

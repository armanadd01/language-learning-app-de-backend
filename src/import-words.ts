import fs from 'fs';
import path from 'path';
import readline from 'readline';

import dotenv from 'dotenv';

dotenv.config();

import { connectToDatabase } from './lib/db';
import { env } from './lib/env';
import { WordModel } from './models/Word';

function normalize(word: string) {
  return word.trim().toLowerCase();
}

type ImportOptions = {
  filePath: string;
  batchSize: number;
  startLine: number;
};

function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  let filePath: string | undefined;
  let batchSize: number | undefined;
  let startLine: number | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];

    if (a.startsWith('--file=')) {
      filePath = a.slice('--file='.length);
      continue;
    }
    if (a === '--file' || a === '-f') {
      filePath = args[i + 1];
      i += 1;
      continue;
    }

    if (a.startsWith('--batch=')) {
      batchSize = Number(a.slice('--batch='.length));
      continue;
    }
    if (a === '--batch') {
      batchSize = Number(args[i + 1]);
      i += 1;
      continue;
    }

    if (a.startsWith('--startLine=')) {
      startLine = Number(a.slice('--startLine='.length));
      continue;
    }
    if (a === '--startLine') {
      startLine = Number(args[i + 1]);
      i += 1;
      continue;
    }
  }

  const resolvedFilePath = filePath ?? process.env.WORDS_FILE;
  if (!resolvedFilePath) {
    throw new Error('Missing --file=... argument (or set WORDS_FILE env var)');
  }

  return {
    filePath: resolvedFilePath,
    batchSize: Number.isFinite(batchSize) && (batchSize as number) > 0 ? (batchSize as number) : 10000,
    startLine: Number.isFinite(startLine) && (startLine as number) > 0 ? (startLine as number) : 1,
  };
}

async function main() {
  const opts = parseArgs();

  const absPath = path.isAbsolute(opts.filePath) ? opts.filePath : path.resolve(process.cwd(), opts.filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  await connectToDatabase(env.MONGODB_URI);

  const stream = fs.createReadStream(absPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = 0;
  let inserted = 0;
  let processed = 0;
  let batch: Array<{ insertOne: { document: { word: string; normalized: string; lang: 'de' } } }> = [];

  const flush = async () => {
    if (!batch.length) return;
    const ops = batch;
    batch = [];

    const res = await WordModel.bulkWrite(ops, { ordered: false });
    inserted += res.insertedCount;

    if (processed % 100000 < opts.batchSize) {
      // eslint-disable-next-line no-console
      console.log(`Processed ${processed.toLocaleString()} | Inserted ${inserted.toLocaleString()} | Current line ${lineNo.toLocaleString()}`);
    }
  };

  for await (const rawLine of rl) {
    lineNo += 1;
    if (lineNo < opts.startLine) continue;

    const line = rawLine.trim();
    if (!line) continue;

    // JSON array: first line is '[' and last line is ']' and middle lines are quoted strings.
    if (line === '[' || line === ']' || line === '],' || line === '],') continue;

    let value = line;
    if (value.endsWith(',')) value = value.slice(0, -1);

    // Lines look like: "Aachen"
    try {
      const word = JSON.parse(value) as unknown;
      if (typeof word !== 'string') continue;
      const normalized = normalize(word);
      if (!normalized) continue;

      batch.push({
        insertOne: {
          document: {
            word,
            normalized,
            lang: 'de',
          },
        },
      });

      processed += 1;

      if (batch.length >= opts.batchSize) {
        try {
          await flush();
        } catch (err: any) {
          // Duplicate key errors are expected due to unique normalized index.
          if (err?.writeErrors?.length) {
            // Ignore and continue.
          } else {
            throw err;
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  try {
    await flush();
  } catch (err: any) {
    if (err?.writeErrors?.length) {
      // ignore
    } else {
      throw err;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Processed ${processed.toLocaleString()} | Inserted ${inserted.toLocaleString()}`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

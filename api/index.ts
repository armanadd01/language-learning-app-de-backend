import dotenv from 'dotenv';
dotenv.config();

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../src/server';
import { connectToDatabase } from '../src/lib/db';
import { env } from '../src/lib/env';

// Import all models to ensure they are registered with Mongoose
import '../src/models/User';
import '../src/models/Level';
import '../src/models/Module';
import '../src/models/Lesson';
import '../src/models/Activity';
import '../src/models/Progress';
import '../src/models/Word';
import '../src/models/DictionaryCache';
import '../src/models/Grammar';

let app: ReturnType<typeof createServer>;

async function bootstrap() {
  if (!app) {
    await connectToDatabase(env.MONGODB_URI);
    app = createServer();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await bootstrap();
  app(req, res);
}

import dotenv from 'dotenv';

dotenv.config();

import { createServer } from './server';
import { connectToDatabase } from './lib/db';
import { env } from './lib/env';

// Import all models to ensure they are registered with Mongoose
import './models/User';
import './models/Level';
import './models/Module';
import './models/Lesson';
import './models/Activity';
import './models/Progress';
import './models/Word';
import './models/DictionaryCache';
import './models/Grammar';

async function main() {
  await connectToDatabase(env.MONGODB_URI);
  const app = createServer();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

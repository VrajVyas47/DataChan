import dotenv from 'dotenv';
dotenv.config();

import { connectMongo, getPlatformDb, closeMongo } from '../database/mongoClient';
import { initializePlatformSchema } from '../database/schema/initializeSchema';

async function main() {
  await connectMongo();
  const db = getPlatformDb();
  await initializePlatformSchema(db);
  await closeMongo();
  console.log('✓ Platform schema, validators, and indexes initialized successfully.');
}

main().catch((err) => {
  console.error('Schema initialization failed:', err);
  process.exit(1);
});

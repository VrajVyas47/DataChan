import dotenv from 'dotenv';
dotenv.config();

import { connectMongo, getPlatformDb, getMongoClient, closeMongo } from '../database/mongoClient';
import { logger } from '../logging/logger';
import { PLATFORM_COLLECTIONS } from '../database/schema/collections';
import { initializePlatformSchema } from '../database/schema/initializeSchema';
import { seedDevRoles } from './seedDevRoles';
import { seedDevData } from './seedDevData';

/**
 * DATA-CHAN V1 Safe Development-Only Reset Script
 * 
 * Safely resets development state in MongoDB:
 * - Refuses execution if NODE_ENV=production.
 * - Refuses execution if targeting a remote non-local MongoDB instance.
 * - Requires explicit `--confirm` flag to prevent accidental execution.
 * - Cleans only Data-Chan platform collections and Data-Chan sandbox databases (`dc_ws_*`).
 * - Automatically re-initializes schema, validators, indexes, and baseline dev seed data.
 */
export async function resetDevData() {
  console.log('\n================================================================================');
  console.log('       DATA-CHAN — SAFE DEVELOPMENT RESET (LOCAL EMULATOR ONLY)                ');
  console.log('================================================================================\n');

  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm') || args.includes('-y');

  // SAFETY BARRIER 1: Reject production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: resetDevData cannot and will not run in NODE_ENV=production.');
  }

  // SAFETY BARRIER 2: Reject remote MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const isLocalMongo =
    mongoUri.includes('localhost') ||
    mongoUri.includes('127.0.0.1') ||
    mongoUri.includes('host.docker.internal');

  if (!isLocalMongo) {
    throw new Error(
      `SECURITY VIOLATION: resetDevData requires a local development MongoDB instance. ` +
        `Current MONGODB_URI="${mongoUri}". Refusing to run against potential production database.`
    );
  }

  await connectMongo();
  const db = getPlatformDb();
  const client = getMongoClient();
  const adminDb = client.db().admin();

  // Inspect live MongoDB state
  const { databases } = await adminDb.listDatabases();
  const sandboxDbs = databases.filter((d: any) => d.name.startsWith('dc_ws_'));
  const existingCols = await db.listCollections().toArray();
  const existingNames = new Set(existingCols.map((c) => c.name));

  const canonicalCols = Object.values(PLATFORM_COLLECTIONS);
  const platformColAudit: { name: string; count: number; exists: boolean }[] = [];
  for (const colName of canonicalCols) {
    const exists = existingNames.has(colName);
    const count = exists ? await db.collection(colName).countDocuments() : 0;
    platformColAudit.push({ name: colName, count, exists });
  }

  const legacyProgressExists = existingNames.has('lesson_progress');
  const legacyProgressCount = legacyProgressExists ? await db.collection('lesson_progress').countDocuments() : 0;

  // SAFETY BARRIER 3: Explicit confirmation requirement
  if (!isConfirmed) {
    console.warn('⚠️  RESET DRY RUN (No modifications performed: confirmation flag missing)\n');
    console.log('To execute this destructive development reset, specify the --confirm flag:');
    console.log('  npm run reset:dev -- --confirm\n');
    console.log('================================================================================');
    console.log('PLANNED RESET SCOPE');
    console.log('================================================================================');
    console.log(`• Target Platform Database: "${process.env.MONGODB_PLATFORM_DB || 'datachan_platform'}"`);
    console.log(`• MongoDB Instance: "${mongoUri}" (Localhost only)`);
    console.log('• Protected System Databases: "admin", "config", "local" (EXCLUDED - untouched)\n');

    console.log(`• Canonical Platform Collections to be PURGED (${canonicalCols.length} collections):`);
    for (const item of platformColAudit) {
      const statusStr = item.exists ? `${item.count} records` : 'collection does not exist';
      console.log(`    - ${item.name.padEnd(24)} [${statusStr}]`);
    }

    console.log('\n• Legacy Platform Collections to be PURGED:');
    console.log(
      `    - ${'lesson_progress'.padEnd(24)} [${legacyProgressCount} records] -> PURGED`
    );
    console.log('      (Recreated cleanly with baseline development records during seedDevData re-initialization)');

    console.log(`\n• User Sandbox Databases to be DROPPED (${sandboxDbs.length} databases matching prefix "dc_ws_"):`);
    if (sandboxDbs.length === 0) {
      console.log('    (none found)');
    } else {
      for (const sDb of sandboxDbs) {
        console.log(`    - ${sDb.name}`);
      }
    }

    console.log('\n• Post-Reset Re-initialization:');
    console.log('    1. Re-apply canonical $jsonSchema validators on all 14 platform collections');
    console.log('    2. Re-sync all canonical indexes with conflict detection');
    console.log('    3. Bootstrap development role accounts (student@datachan.test, faculty@datachan.test, admin@datachan.test)');
    console.log('    4. Seed 15 canonical practicals & lessons, challenges, forum posts, and student progress telemetry');
    console.log('    5. Seed clean development baseline for legacy lesson_progress for student@datachan.test');
    console.log('================================================================================\n');

    await closeMongo();
    process.exit(0);
  }

  console.log('⚠️  Confirmed destructive reset flag received. Commencing safe development reset...\n');

  // 1. Drop user sandbox databases (scoped strictly to dc_ws_*)
  console.log(`[Sandboxes] Dropping ${sandboxDbs.length} isolated sandbox databases (matching "dc_ws_*")...`);
  for (const sDb of sandboxDbs) {
    try {
      await client.db(sDb.name).dropDatabase();
      console.log(`  ✓ Dropped sandbox database: ${sDb.name}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Could not drop sandbox ${sDb.name}: ${err.message}`);
    }
  }

  // 2. Clear canonical platform collections
  console.log('\n[Platform] Resetting canonical platform collections...');
  for (const colName of canonicalCols) {
    if (existingNames.has(colName)) {
      try {
        const count = await db.collection(colName).countDocuments();
        await db.collection(colName).deleteMany({});
        console.log(`  ✓ Cleared collection "${colName}" (${count} records deleted)`);
      } catch (err: any) {
        console.warn(`  ⚠️ Could not clear "${colName}": ${err.message}`);
      }
    }
  }

  // 3. Clear legacy collections included in development reset scope
  // NOTE: lesson_progress is purged to eliminate stale/orphan test records.
  // The clean development baseline for student@datachan.test will be recreated
  // immediately during step 5 (seedDevData).
  if (existingNames.has('lesson_progress')) {
    const count = await db.collection('lesson_progress').countDocuments();
    await db.collection('lesson_progress').deleteMany({});
    console.log(`  ✓ Cleared legacy collection "lesson_progress" (${count} records purged; clean baseline recreated by seedDevData)`);
  }

  // 4. Re-initialize canonical schema, validators, and indexes
  console.log('\n[Schema] Re-applying canonical schema validators and indexes...');
  await initializePlatformSchema(db);
  console.log('  ✓ Schema, validators, and indexes initialized');

  await closeMongo();

  // 5. Re-seed dev roles and curriculum
  console.log('\n[Roles] Bootstrapping development role accounts (student/faculty/admin)...');
  await seedDevRoles();

  console.log('\n[Curriculum] Seeding canonical curriculum and telemetry data...');
  await seedDevData();

  console.log('\n================================================================================');
  console.log('       DEVELOPMENT RESET COMPLETED SUCCESSFULLY                                 ');
  console.log('================================================================================\n');
}

if (require.main === module || process.argv[1]?.includes('resetDevData')) {
  resetDevData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nReset failed:', err.message);
      process.exit(1);
    });
}

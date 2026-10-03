import { Db } from 'mongodb';
import { getPlatformDb } from '../mongoClient';
import { logger } from '../../logging/logger';
import { PLATFORM_COLLECTIONS, PlatformCollectionName } from './collections';
import { COLLECTION_VALIDATORS } from './validators';
import { CANONICAL_INDEXES, syncCollectionIndexes } from './indexes';

/**
 * Initializes and reconciles the canonical MongoDB schema for Data-Chan V1.
 * 
 * Responsibilities:
 * 1. Ensures all 14 platform collections exist with active $jsonSchema validators.
 * 2. Updates validators on existing collections via collMod without destructive side-effects.
 * 3. Idempotently creates and reconciles canonical indexes (resolves conflicts safely).
 * 4. Backfills legacy data into canonical collections (e.g. classroom_members, learning_progress).
 * 5. Does NOT insert development seed data during startup (preserves production purity).
 */
export async function initializePlatformSchema(targetDb?: Db): Promise<void> {
  const db = targetDb || getPlatformDb();
  logger.info(`Starting canonical schema initialization on platform database: "${db.databaseName}"`);

  // 1. Inspect existing collections
  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  const allCollectionNames = Object.values(PLATFORM_COLLECTIONS);

  for (const collName of allCollectionNames) {
    const validatorDef = COLLECTION_VALIDATORS[collName];

    // Create collection if missing
    if (!existingNames.has(collName)) {
      try {
        if (validatorDef) {
          await db.createCollection(collName, {
            validator: validatorDef.validator,
            validationLevel: validatorDef.validationLevel || 'moderate',
            validationAction: validatorDef.validationAction || 'error',
          });
          logger.info(`Created collection "${collName}" with $jsonSchema validator`);
        } else {
          await db.createCollection(collName);
          logger.info(`Created collection "${collName}"`);
        }
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          logger.warn(`Could not create collection "${collName}": ${err.message}`);
        }
      }
    } else if (validatorDef) {
      // Apply/update validator on existing collection via collMod
      try {
        await db.command({
          collMod: collName,
          validator: validatorDef.validator,
          validationLevel: validatorDef.validationLevel || 'moderate',
          validationAction: validatorDef.validationAction || 'error',
        });
        logger.info(`Updated $jsonSchema validator on existing collection "${collName}"`);
      } catch (modErr: any) {
        logger.warn(`Could not modify validator on "${collName}": ${modErr.message}`);
      }
    }

    // Synchronize canonical indexes idempotently
    const indexDefs = CANONICAL_INDEXES[collName] || [];
    if (indexDefs.length > 0) {
      await syncCollectionIndexes(db.collection(collName), indexDefs);
    }
  }

  // ==========================================================================
  // Canonical Reconciliations & Backfills
  // ==========================================================================

  try {
    // A. Reconcile Users: Ensure all users have status: 'active' if missing
    await db.collection('users').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active', updatedAt: new Date().toISOString() } }
    );

    // B. Reconcile Virtual Databases: Ensure all have status: 'active' if missing
    await db.collection('virtual_databases').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active', updatedAt: new Date().toISOString() } }
    );

    // C. Reconcile Classrooms: Ensure status: 'active' if missing
    await db.collection('classrooms').updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active', updatedAt: new Date().toISOString() } }
    );

    // D. Backfill classroom_members from existing classrooms.enrolledStudentIds
    const classrooms = await db.collection('classrooms').find().toArray();
    for (const c of classrooms) {
      if (Array.isArray(c.enrolledStudentIds) && c.enrolledStudentIds.length > 0) {
        for (const studentId of c.enrolledStudentIds) {
          await db.collection('classroom_members').updateOne(
            { classroomId: c.id, userId: studentId },
            {
              $setOnInsert: {
                classroomId: c.id,
                userId: studentId,
                role: 'student',
                status: 'active',
                enrolledAt: c.createdAt || new Date().toISOString(),
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // E. Backfill learning_progress from legacy lesson_progress (if exists)
    if (existingNames.has('lesson_progress')) {
      const legacyProgress = await db.collection('lesson_progress').find().toArray();
      for (const lp of legacyProgress) {
        const practicalId = lp.lessonId || lp.practicalId;
        if (lp.userId && practicalId) {
          await db.collection('learning_progress').updateOne(
            { userId: lp.userId, practicalId },
            {
              $setOnInsert: {
                userId: lp.userId,
                practicalId,
                status: lp.completed ? 'completed' : 'in_progress',
                attempts: lp.attemptsCount || 1,
                bestScore: lp.completed ? 100 : 0,
                xpEarned: lp.completed ? 50 : 0,
                startedAt: lp.completedAt || new Date().toISOString(),
                completedAt: lp.completed ? lp.completedAt || new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
              },
            },
            { upsert: true }
          );
        }
      }
    }

    logger.info('Canonical schema initialization, index synchronization, and backfills complete.');
  } catch (reconcileErr: any) {
    logger.warn(`Non-blocking reconciliation notice: ${reconcileErr.message}`);
  }
}

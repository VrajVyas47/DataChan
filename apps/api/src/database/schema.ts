import { Db } from 'mongodb';
import { getPlatformDb } from './mongoClient';
import { logger } from '../logging/logger';
import { INITIAL_FORUM_POSTS } from '../modules/forum/forumSeed';

/**
 * MongoDB Platform Schema Definitions and Collection Initializer.
 * Enforces JSON Schema validation, creates performant indexes, and seeds platform data.
 */
export async function initializePlatformSchema(): Promise<void> {
  const db = getPlatformDb();
  logger.info('Initializing MongoDB Platform schemas, validators, and indexes...');

  try {
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((c) => c.name));

    // 1. Users Collection
    if (!existingNames.has('users')) {
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'email', 'username', 'role'],
            properties: {
              id: { bsonType: 'string', description: 'Unique user identifier' },
              email: { bsonType: 'string', pattern: '^.+@.+$', description: 'User institutional/personal email' },
              username: { bsonType: 'string', description: 'Normalized username' },
              role: {
                enum: ['student', 'faculty', 'admin'],
                description: 'First-class RBAC role: student, faculty, or admin',
              },
              status: {
                enum: ['active', 'suspended', 'disabled'],
                description: 'Account state: active, suspended, or disabled',
              },
              emailVerified: { bsonType: 'bool' },
              displayName: { bsonType: 'string' },
              xp: { bsonType: ['int', 'double', 'long'] },
              level: { bsonType: ['int', 'double', 'long'] },
              streakDays: { bsonType: ['int', 'double', 'long'] },
              activeWorkspaceId: { bsonType: ['string', 'null'] },
              activeDatabaseId: { bsonType: ['string', 'null'] },
              createdAt: { bsonType: ['string', 'date'] },
              updatedAt: { bsonType: ['string', 'date'] },
              lastLoginAt: { bsonType: ['string', 'date'] },
            },
          },
        },
      });
      logger.info('Created "users" collection with $jsonSchema validator');
    }

    // Indexes for users
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    try {
      const duplicates = await db.collection('users').aggregate([
        { $group: { _id: '$email', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } },
      ]).toArray();
      for (const dup of duplicates) {
        const [keep, ...remove] = dup.docs;
        if (remove.length > 0) {
          await db.collection('users').deleteMany({ _id: { $in: remove } });
        }
      }
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
    } catch (e: any) {
      logger.warn('Could not enforce unique email index:', e.message);
    }
    await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ status: 1 });

    // Security Audit Logs Collection
    if (!existingNames.has('security_audit_logs')) {
      await db.createCollection('security_audit_logs');
    }
    await db.collection('security_audit_logs').createIndex({ timestamp: -1 });
    await db.collection('security_audit_logs').createIndex({ userId: 1 });
    await db.collection('security_audit_logs').createIndex({ action: 1 });

    // 2. Workspaces Collection
    if (!existingNames.has('workspaces')) {
      await db.createCollection('workspaces', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'userId', 'name'],
            properties: {
              id: { bsonType: 'string' },
              userId: { bsonType: 'string' },
              name: { bsonType: 'string' },
              description: { bsonType: 'string' },
              createdAt: { bsonType: ['string', 'date'] },
            },
          },
        },
      });
      logger.info('Created "workspaces" collection with $jsonSchema validator');
    }
    await db.collection('workspaces').createIndex({ id: 1 }, { unique: true });
    await db.collection('workspaces').createIndex({ userId: 1 });

    // 3. Virtual Databases Collection
    if (!existingNames.has('virtual_databases')) {
      await db.createCollection('virtual_databases', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'workspaceId', 'userId', 'name', 'physicalNamespace'],
            properties: {
              id: { bsonType: 'string' },
              workspaceId: { bsonType: 'string' },
              userId: { bsonType: 'string' },
              name: { bsonType: 'string' },
              physicalNamespace: { bsonType: 'string' },
            },
          },
        },
      });
      logger.info('Created "virtual_databases" collection with $jsonSchema validator');
    }
    await db.collection('virtual_databases').createIndex({ id: 1 }, { unique: true });
    await db.collection('virtual_databases').createIndex({ workspaceId: 1, name: 1 }, { unique: true });
    await db.collection('virtual_databases').createIndex({ userId: 1 });

    // 4. Forum Posts Collection
    if (!existingNames.has('forum_posts')) {
      await db.createCollection('forum_posts', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'title', 'content', 'category', 'authorId'],
            properties: {
              id: { bsonType: 'string' },
              title: { bsonType: 'string' },
              content: { bsonType: 'string' },
              category: { bsonType: 'string' },
              authorId: { bsonType: 'string' },
              upvotes: { bsonType: ['int', 'double', 'long'] },
              replyCount: { bsonType: ['int', 'double', 'long'] },
              views: { bsonType: ['int', 'double', 'long'] },
              isPinned: { bsonType: 'bool' },
              isSolved: { bsonType: 'bool' },
            },
          },
        },
      });
      logger.info('Created "forum_posts" collection with $jsonSchema validator');
    }
    await db.collection('forum_posts').createIndex({ id: 1 }, { unique: true });
    await db.collection('forum_posts').createIndex({ category: 1, createdAt: -1 });
    await db.collection('forum_posts').createIndex({ tags: 1 });
    await db.collection('forum_posts').createIndex({ authorId: 1 });

    // Seed initial forum posts if empty
    const postCount = await db.collection('forum_posts').countDocuments();
    if (postCount === 0) {
      logger.info('Seeding initial curated forum posts into MongoDB...');
      await db.collection('forum_posts').insertMany(INITIAL_FORUM_POSTS);
    }

    // 5. Classrooms / Cohorts Collection
    if (!existingNames.has('classrooms')) {
      await db.createCollection('classrooms', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'code', 'name', 'facultyId'],
            properties: {
              id: { bsonType: 'string' },
              code: { bsonType: 'string', minLength: 4, maxLength: 10 },
              name: { bsonType: 'string' },
              facultyId: { bsonType: 'string' },
              facultyName: { bsonType: 'string' },
              description: { bsonType: 'string' },
              enrolledStudentIds: { bsonType: 'array' },
            },
          },
        },
      });
      logger.info('Created "classrooms" collection with $jsonSchema validator');
    }
    await db.collection('classrooms').createIndex({ id: 1 }, { unique: true });
    await db.collection('classrooms').createIndex({ code: 1 }, { unique: true });
    await db.collection('classrooms').createIndex({ facultyId: 1 });
    await db.collection('classrooms').createIndex({ enrolledStudentIds: 1 });

    // Seed default classroom if empty
    const classroomCount = await db.collection('classrooms').countDocuments();
    if (classroomCount === 0) {
      await db.collection('classrooms').insertOne({
        id: 'cls_cs101_init',
        code: 'CS-101',
        name: 'CS-101: Introduction to Modern Database Systems',
        facultyId: 'prof_sharma',
        facultyName: 'Professor Sharma',
        description: 'Core university cohort exploring document data models, AST querying, and indexing strategies.',
        enrolledStudentIds: ['fresh_onboard', 'vraj_dev'],
        activeChallengeIds: ['ch-01-find-active', 'ch-02-high-gpa', 'ch-03-indexing-boost'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logger.info('Seeded default CS-101 classroom cohort in MongoDB');
    }

    // 6. Query History Collection
    if (!existingNames.has('query_history')) {
      await db.createCollection('query_history');
    }
    await db.collection('query_history').createIndex({ userId: 1, executedAt: -1 });
    await db.collection('query_history').createIndex({ databaseId: 1 });

    // 7. Data Models Collection
    if (!existingNames.has('data_models')) {
      await db.createCollection('data_models');
    }
    await db.collection('data_models').createIndex({ id: 1 }, { unique: true });
    await db.collection('data_models').createIndex({ userId: 1, databaseId: 1 });

    // 8. Challenge Attempts Collection
    if (!existingNames.has('challenge_attempts')) {
      await db.createCollection('challenge_attempts');
    }
    await db.collection('challenge_attempts').createIndex({ userId: 1, challengeId: 1 });

    logger.info('MongoDB platform schemas, validators, and compound indexes successfully initialized.');
  } catch (err: any) {
    logger.warn('Schema initialization warning (some validators/indexes may already exist):', err.message);
  }
}

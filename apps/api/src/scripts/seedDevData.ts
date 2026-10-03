import dotenv from 'dotenv';
dotenv.config();

import { connectMongo, getPlatformDb, closeMongo } from '../database/mongoClient';
import { logger } from '../logging/logger';
import { PLATFORM_COLLECTIONS } from '../database/schema/collections';
import {
  CANONICAL_COURSE,
  CANONICAL_MODULES,
  CURRICULUM_LESSONS,
  generateCurriculumSections,
} from '../modules/learning/curriculumSeed';
import { LAB_CHALLENGES } from '../modules/challenges/challengeSeed';
import { INITIAL_FORUM_POSTS } from '../modules/forum/forumSeed';

/**
 * DATA-CHAN V1 Development Data Seeder
 * 
 * Safely seeds canonical curriculum practicals, lessons, challenges, forum posts,
 * and demonstration telemetry records into `datachan_platform`.
 * 
 * Strict safety barriers:
 * - Refuses execution if NODE_ENV=production.
 * - Refuses execution if targeting a remote MongoDB instance.
 * - Idempotent upserts only: safe to run multiple times without duplicate records.
 */
export async function seedDevData() {
  console.log('\n================================================================================');
  console.log('       DATA-CHAN — CANONICAL DEVELOPMENT DATA SEEDER (LOCAL ONLY)               ');
  console.log('================================================================================\n');

  // SAFETY BARRIER 1: Reject production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: seedDevData cannot run in NODE_ENV=production.');
  }

  // SAFETY BARRIER 2: Reject remote MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const isLocalMongo =
    mongoUri.includes('localhost') ||
    mongoUri.includes('127.0.0.1') ||
    mongoUri.includes('host.docker.internal');

  if (!isLocalMongo) {
    throw new Error(
      `SECURITY VIOLATION: seedDevData requires a local development MongoDB instance. ` +
        `Current MONGODB_URI="${mongoUri}". Refusing to run against potential production database.`
    );
  }

  await connectMongo();
  const db = getPlatformDb();
  const now = new Date().toISOString();

  logger.info(`Starting canonical development seed on database: "${db.databaseName}"...`);

  // ==========================================================================
  // A. Canonical Curriculum: Course, Modules, Lessons, Sections & Practicals
  // ==========================================================================
  console.log('\n[Curriculum] Seeding canonical course, modules, lessons, and sections...');

  // 1. Seed Course
  await db.collection(PLATFORM_COLLECTIONS.COURSES).updateOne(
    { id: CANONICAL_COURSE.id },
    {
      $set: {
        id: CANONICAL_COURSE.id,
        title: CANONICAL_COURSE.title,
        description: CANONICAL_COURSE.description,
        status: CANONICAL_COURSE.status,
        order: CANONICAL_COURSE.order,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  // 2. Seed Modules
  for (const mod of CANONICAL_MODULES) {
    await db.collection(PLATFORM_COLLECTIONS.MODULES).updateOne(
      { id: mod.id },
      {
        $set: {
          id: mod.id,
          courseId: mod.courseId,
          title: mod.title,
          description: mod.description,
          order: mod.order,
          status: mod.status,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }

  // 3. Seed Lessons & Practicals
  let practicalCount = 0;
  for (const lesson of CURRICULUM_LESSONS) {
    const num = lesson.order;
    const practicalId = `practical_${num.toString().padStart(2, '0')}`;

    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (num > 10) difficulty = 'advanced';
    else if (num > 5) difficulty = 'intermediate';

    // Practical record
    await db.collection(PLATFORM_COLLECTIONS.PRACTICALS).updateOne(
      { id: practicalId },
      {
        $set: {
          id: practicalId,
          number: num,
          title: lesson.title,
          category: lesson.category,
          description: lesson.description,
          xpReward: lesson.xpReward || 50,
          difficulty,
          published: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Lesson record referencing module and practical
    await db.collection(PLATFORM_COLLECTIONS.LESSONS).updateOne(
      { id: lesson.id },
      {
        $set: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          courseId: lesson.courseId,
          practicalId,
          challengeIds: lesson.challengeIds || [],
          order: lesson.order,
          title: lesson.title,
          category: lesson.category,
          estimatedMinutes: lesson.estimatedMinutes,
          xpReward: lesson.xpReward,
          description: lesson.description,
          conceptMarkdown: lesson.conceptMarkdown,
          exampleQuery: lesson.exampleQuery,
          starterPracticeQuery: lesson.starterPracticeQuery,
          practiceCollection: lesson.practiceCollection,
          practiceExplanation: lesson.practiceExplanation,
          status: 'published',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    practicalCount++;
  }

  // 4. Seed Lesson Sections with ContentBlocks
  const sections = generateCurriculumSections();
  for (const sec of sections) {
    await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).updateOne(
      { id: sec.id },
      {
        $set: {
          id: sec.id,
          lessonId: sec.lessonId,
          title: sec.title,
          description: sec.description,
          order: sec.order,
          status: sec.status,
          contentBlocks: sec.contentBlocks,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  console.log(`✓ Seeded 1 course, ${CANONICAL_MODULES.length} modules, ${practicalCount} lessons, and ${sections.length} sections into MongoDB`);

  // ==========================================================================
  // B. Canonical Challenges
  // ==========================================================================
  console.log('\n[Challenges] Seeding canonical challenges...');

  let challengeCount = 0;
  for (const ch of LAB_CHALLENGES) {
    await db.collection(PLATFORM_COLLECTIONS.CHALLENGES).updateOne(
      { id: ch.id },
      {
        $set: {
          id: ch.id,
          title: ch.title,
          description: ch.problemStatement,
          difficulty: ch.difficulty,
          type: 'mql_query',
          category: ch.category,
          xpReward: ch.xpReward,
          estimatedMinutes: ch.estimatedMinutes,
          problemStatement: ch.problemStatement,
          contextDescription: ch.contextDescription,
          targetCollection: ch.targetCollection,
          starterQuery: ch.starterQuery,
          hints: ch.hints,
          datasetDescription: ch.datasetDescription,
          verificationType: ch.verificationType,
          published: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
    challengeCount++;
  }
  console.log(`✓ Seeded ${challengeCount} canonical challenges into MongoDB`);

  // ==========================================================================
  // C. Canonical Forum Posts
  // ==========================================================================
  console.log('\n[Forums] Seeding curated community forum posts...');

  let forumCount = 0;
  for (const post of INITIAL_FORUM_POSTS) {
    const { _id, createdAt: postCreatedAt, ...postFields } = post as any;
    await db.collection(PLATFORM_COLLECTIONS.FORUM_POSTS).updateOne(
      { id: post.id },
      {
        $set: {
          ...postFields,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: postCreatedAt || now,
        },
      },
      { upsert: true }
    );
    forumCount++;
  }
  console.log(`✓ Seeded ${forumCount} curated forum posts into MongoDB`);

  // ==========================================================================
  // D. Demonstration Telemetry & Student Learning Progress
  // ==========================================================================
  console.log('\n[Demonstration Data] Seeding student progress and query telemetry...');

  const studentUser = await db.collection(PLATFORM_COLLECTIONS.USERS).findOne({ email: 'student@datachan.test' });
  if (studentUser) {
    // 1. Practical 1: Completed
    await db.collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS).updateOne(
      { userId: studentUser.id, practicalId: 'practical_01' },
      {
        $set: {
          userId: studentUser.id,
          practicalId: 'practical_01',
          lessonId: 'lesson-1-mongodb-basics',
          completedSectionIds: [
            'sec-lesson-1-mongodb-basics-1-concept',
            'sec-lesson-1-mongodb-basics-2-syntax',
            'sec-lesson-1-mongodb-basics-3-practice',
          ],
          progressPercent: 100,
          status: 'completed',
          attempts: 2,
          bestScore: 100,
          xpEarned: 50,
          startedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // Also sync to legacy lesson_progress for backwards compatibility
    await db.collection('lesson_progress').updateOne(
      { userId: studentUser.id, lessonId: 'lesson-1-mongodb-basics' },
      {
        $set: {
          userId: studentUser.id,
          lessonId: 'lesson-1-mongodb-basics',
          completed: true,
          completedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
          attemptsCount: 2,
        },
      },
      { upsert: true }
    );

    // 2. Practical 2: In Progress
    await db.collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS).updateOne(
      { userId: studentUser.id, practicalId: 'practical_02' },
      {
        $set: {
          userId: studentUser.id,
          practicalId: 'practical_02',
          status: 'in_progress',
          attempts: 1,
          bestScore: 0,
          xpEarned: 0,
          startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          completedAt: null,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // 3. Sample Query History for student
    const studentVdb = await db.collection(PLATFORM_COLLECTIONS.VIRTUAL_DATABASES).findOne({ userId: studentUser.id });
    if (studentVdb) {
      const sampleQueries = [
        {
          userId: studentUser.id,
          databaseId: studentVdb.id,
          operation: 'find',
          queryText: 'db.students.find({ major: "Computer Science" })',
          rawQuery: 'db.students.find({ major: "Computer Science" })',
          executionTimeMs: 14,
          resultCount: 3,
          documentsReturned: 3,
          status: 'success' as const,
          errorCode: null,
          collection: 'students',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          userId: studentUser.id,
          databaseId: studentVdb.id,
          operation: 'countDocuments',
          queryText: 'db.students.countDocuments()',
          rawQuery: 'db.students.countDocuments()',
          executionTimeMs: 4,
          resultCount: 1,
          documentsReturned: 1,
          status: 'success' as const,
          errorCode: null,
          collection: 'students',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ];

      for (const sq of sampleQueries) {
        await db.collection(PLATFORM_COLLECTIONS.QUERY_HISTORY).updateOne(
          { userId: sq.userId, rawQuery: sq.rawQuery, databaseId: sq.databaseId },
          { $set: sq },
          { upsert: true }
        );
      }
      console.log('✓ Seeded demonstration progress and query telemetry for student@datachan.test');
    }
  }

  console.log('\n================================================================================');
  console.log('       DEVELOPMENT SEED DATA APPLIED SUCCESSFULLY (ALL IDEMPOTENT)             ');
  console.log('================================================================================\n');

  await closeMongo();
}

if (require.main === module || process.argv[1]?.includes('seedDevData')) {
  seedDevData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nSeed failed:', err.message);
      process.exit(1);
    });
}

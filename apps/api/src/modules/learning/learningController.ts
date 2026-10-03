import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, Lesson } from '@datachan/shared-types';
import { PLATFORM_COLLECTIONS } from '../../database/schema/collections';
import { CURRICULUM_LESSONS } from './curriculumSeed';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';
import { parseMqlQuery } from '../../security/queryParser';
import { sanitizeDocumentIds } from '../playground/playgroundController';
import { config } from '../../config';

export async function listLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';
    const moduleId = req.query.moduleId ? String(req.query.moduleId) : undefined;
    const courseId = req.query.courseId ? String(req.query.courseId) : undefined;

    const filter: Record<string, any> = {};
    if (moduleId) {
      filter.moduleId = moduleId;
    }
    if (courseId) {
      filter.courseId = courseId;
    }

    if (isStudent) {
      filter.status = 'published';
      if (moduleId) {
        const mod = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id: moduleId });
        if (!mod || mod.status !== 'published') {
          const emptyResponse: ApiResponse<Lesson[]> = {
            success: true,
            data: [],
            error: null,
          };
          res.json(emptyResponse);
          return;
        }
      }
    } else if (req.query.status && (req.query.status === 'draft' || req.query.status === 'published')) {
      filter.status = req.query.status;
    }

    // Try reading lessons from database first
    let dbLessons = await db
      .collection(PLATFORM_COLLECTIONS.LESSONS)
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    // Fallback if collection is not yet populated
    if (dbLessons.length === 0 && Object.keys(filter).length === 0) {
      dbLessons = CURRICULUM_LESSONS as any[];
    }

    // Fetch progress for this user
    const userId = req.user?.userId;
    const progressMap = new Map<string, { completed: boolean; completedSectionIds?: string[]; progressPercent?: number }>();
    if (userId) {
      const canonicalProgress = await db
        .collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS)
        .find({ userId })
        .toArray();

      for (const cp of canonicalProgress) {
        if (cp.lessonId) {
          progressMap.set(cp.lessonId, {
            completed: !!cp.completed,
            completedSectionIds: cp.completedSectionIds || [],
            progressPercent: cp.progressPercent || (cp.completed ? 100 : 0),
          });
        }
      }

      // Merge legacy lesson_progress
      const legacyProgress = await db
        .collection('lesson_progress')
        .find({ userId })
        .toArray();
      for (const lp of legacyProgress) {
        if (lp.completed && (!progressMap.has(lp.lessonId) || !progressMap.get(lp.lessonId)!.completed)) {
          progressMap.set(lp.lessonId, {
            completed: true,
            completedSectionIds: progressMap.get(lp.lessonId)?.completedSectionIds || [],
            progressPercent: 100,
          });
        }
      }
    }

    // Attach section count per lesson
    const sectionsCol = db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS);
    const enriched = await Promise.all(
      dbLessons.map(async (l) => {
        const secFilter: Record<string, any> = { lessonId: l.id };
        if (isStudent) secFilter.status = 'published';
        const sectionsCount = await sectionsCol.countDocuments(secFilter);
        const p = progressMap.get(l.id);

        return {
          id: l.id,
          moduleId: l.moduleId,
          courseId: l.courseId,
          title: l.title,
          description: l.description,
          category: l.category,
          difficulty: l.difficulty,
          order: l.order || 1,
          status: l.status || 'published',
          xpReward: l.xpReward,
          practiceCollection: l.practiceCollection,
          sampleQuery: l.sampleQuery,
          expectedPattern: l.expectedPattern,
          challengeIds: l.challengeIds || [],
          practicalId: l.practicalId,
          sectionsCount,
          completed: p?.completed || false,
          completedSectionIds: p?.completedSectionIds || [],
          progressPercent: p?.progressPercent || (p?.completed ? 100 : 0),
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        };
      })
    );

    const response: ApiResponse<any[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const isStudent = req.user?.role === 'student';

    let lesson: any = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id });
    if (!lesson) {
      lesson = CURRICULUM_LESSONS.find((l) => l.id === id);
    }

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    if (isStudent) {
      if (lesson.status && lesson.status !== 'published') {
        throw new ResourceNotFoundError('Lesson', id);
      }
      if (lesson.moduleId) {
        const mod = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id: lesson.moduleId });
        if (mod && mod.status !== 'published') {
          throw new ResourceNotFoundError('Lesson', id);
        }
      }
    }

    const userId = req.user?.userId;
    let completed = false;
    let completedSectionIds: string[] = [];
    let progressPercent = 0;

    if (userId) {
      const p = await db
        .collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS)
        .findOne({ userId, lessonId: id });
      if (p) {
        completed = !!p.completed;
        completedSectionIds = p.completedSectionIds || [];
        progressPercent = p.progressPercent || (p.completed ? 100 : 0);
      } else {
        const legacy = await db
          .collection('lesson_progress')
          .findOne({ userId, lessonId: id });
        if (legacy?.completed) {
          completed = true;
          progressPercent = 100;
        }
      }
    }

    const secFilter: Record<string, any> = { lessonId: lesson.id };
    if (isStudent) secFilter.status = 'published';
    const sectionsCount = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).countDocuments(secFilter);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: lesson.id,
        moduleId: lesson.moduleId,
        courseId: lesson.courseId,
        title: lesson.title,
        description: lesson.description,
        category: lesson.category,
        difficulty: lesson.difficulty,
        order: lesson.order || 1,
        status: lesson.status || 'published',
        xpReward: lesson.xpReward,
        practiceCollection: lesson.practiceCollection,
        sampleQuery: lesson.sampleQuery,
        expectedPattern: lesson.expectedPattern,
        challengeIds: lesson.challengeIds || [],
        practicalId: lesson.practicalId,
        sectionsCount,
        completed,
        completedSectionIds,
        progressPercent,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      moduleId,
      courseId,
      title,
      description = '',
      category = 'Curriculum',
      difficulty = 'beginner',
      status = 'draft',
      order,
      xpReward = 50,
      practiceCollection = 'students',
      sampleQuery = 'db.students.find()',
      expectedPattern = '',
      challengeIds = [],
      practicalId,
    } = req.body;

    if (!moduleId || typeof moduleId !== 'string') {
      throw new InvalidRequestError('moduleId is required to create a lesson');
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new InvalidRequestError('Lesson title is required');
    }
    if (status !== 'draft' && status !== 'published') {
      throw new InvalidRequestError('Status must be either "draft" or "published"');
    }

    const db = getPlatformDb();
    const mod = await db.collection(PLATFORM_COLLECTIONS.MODULES).findOne({ id: moduleId });
    if (!mod) {
      throw new ResourceNotFoundError('Module', moduleId);
    }

    let lessonOrder = typeof order === 'number' ? order : 1;
    if (typeof order !== 'number') {
      const highest = await db
        .collection(PLATFORM_COLLECTIONS.LESSONS)
        .find({ moduleId })
        .sort({ order: -1 })
        .limit(1)
        .toArray();
      if (highest.length > 0 && typeof highest[0].order === 'number') {
        lessonOrder = highest[0].order + 1;
      }
    }

    const now = new Date().toISOString();
    const id = `les_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newLesson: Lesson = {
      id,
      moduleId,
      courseId: courseId || mod.courseId,
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      order: lessonOrder,
      estimatedMinutes: 15,
      status,
      xpReward,
      practiceCollection,
      sampleQuery,
      expectedPattern,
      challengeIds: Array.isArray(challengeIds) ? challengeIds : [],
      practicalId: typeof practicalId === 'string' ? practicalId : undefined,
      sectionsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(PLATFORM_COLLECTIONS.LESSONS).insertOne(newLesson as any);

    const response: ApiResponse<Lesson> = {
      success: true,
      data: newLesson,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const {
      moduleId,
      title,
      description,
      category,
      difficulty,
      status,
      order,
      xpReward,
      practiceCollection,
      sampleQuery,
      expectedPattern,
      challengeIds,
      practicalId,
    } = req.body;

    const db = getPlatformDb();
    const existing = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (moduleId && typeof moduleId === 'string') updateFields.moduleId = moduleId;
    if (title && typeof title === 'string') updateFields.title = title.trim();
    if (description !== undefined && typeof description === 'string') updateFields.description = description.trim();
    if (category && typeof category === 'string') updateFields.category = category;
    if (difficulty && typeof difficulty === 'string') updateFields.difficulty = difficulty;
    if (status && (status === 'draft' || status === 'published')) updateFields.status = status;
    if (typeof order === 'number') updateFields.order = order;
    if (typeof xpReward === 'number') updateFields.xpReward = xpReward;
    if (typeof practiceCollection === 'string') updateFields.practiceCollection = practiceCollection;
    if (typeof sampleQuery === 'string') updateFields.sampleQuery = sampleQuery;
    if (typeof expectedPattern === 'string') updateFields.expectedPattern = expectedPattern;
    if (Array.isArray(challengeIds)) updateFields.challengeIds = challengeIds;
    if (practicalId !== undefined) updateFields.practicalId = practicalId;

    await db.collection(PLATFORM_COLLECTIONS.LESSONS).updateOne({ id }, { $set: updateFields });

    const updated = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id });
    const sectionsCount = await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).countDocuments({ lessonId: id });

    const response: ApiResponse<Lesson> = {
      success: true,
      data: {
        id: updated!.id,
        moduleId: updated!.moduleId,
        courseId: updated!.courseId,
        title: updated!.title,
        description: updated!.description,
        category: updated!.category,
        difficulty: updated!.difficulty,
        order: updated!.order || 1,
        estimatedMinutes: updated!.estimatedMinutes || 15,
        status: updated!.status || 'published',
        xpReward: updated!.xpReward,
        practiceCollection: updated!.practiceCollection,
        sampleQuery: updated!.sampleQuery,
        expectedPattern: updated!.expectedPattern,
        challengeIds: updated!.challengeIds || [],
        practicalId: updated!.practicalId,
        sectionsCount,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    const existing = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id });
    if (!existing) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    // Cascade delete sections under this lesson
    await db.collection(PLATFORM_COLLECTIONS.LESSON_SECTIONS).deleteMany({ lessonId: id });
    await db.collection(PLATFORM_COLLECTIONS.LESSONS).deleteOne({ id });

    const response: ApiResponse<{ deleted: boolean; id: string }> = {
      success: true,
      data: { deleted: true, id },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function reorderLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new InvalidRequestError('items array with { id, order } is required for reordering');
    }

    const db = getPlatformDb();
    const now = new Date().toISOString();

    await Promise.all(
      items.map(async (item: { id: string; order: number }) => {
        if (item.id && typeof item.order === 'number') {
          await db
            .collection(PLATFORM_COLLECTIONS.LESSONS)
            .updateOne({ id: item.id }, { $set: { order: item.order, updatedAt: now } });
        }
      })
    );

    const response: ApiResponse<{ success: boolean }> = {
      success: true,
      data: { success: true },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function completeLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();

    let lesson: any = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id });
    if (!lesson) {
      lesson = CURRICULUM_LESSONS.find((l) => l.id === id);
    }

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const userId = req.user!.userId;
    const existing = await db
      .collection('lesson_progress')
      .findOne({ userId, lessonId: id });

    let xpAwarded = 0;
    const now = new Date().toISOString();

    if (!existing || !existing.completed) {
      xpAwarded = lesson.xpReward || 50;

      // Update legacy lesson_progress
      await db.collection('lesson_progress').updateOne(
        { userId, lessonId: id },
        {
          $set: {
            userId,
            lessonId: id,
            completed: true,
            completedAt: now,
          },
        },
        { upsert: true }
      );

      // Also update canonical learning_progress
      await db.collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS).updateOne(
        { userId, lessonId: id },
        {
          $set: {
            userId,
            lessonId: id,
            completed: true,
            progressPercent: 100,
            completedAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      // Award XP to user and update level
      await db.collection('users').updateOne(
        { id: userId },
        {
          $inc: { xp: xpAwarded },
          $set: { updatedAt: now },
        }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        completed: true,
        xpAwarded,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function runPractical(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  try {
    const { lessonId, rawQuery, databaseId } = req.body;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      throw new InvalidRequestError('A valid MongoDB query string is required to run this practical');
    }

    const db = getPlatformDb();
    let lesson: any = await db.collection(PLATFORM_COLLECTIONS.LESSONS).findOne({ id: lessonId });
    if (!lesson) {
      lesson = CURRICULUM_LESSONS.find((l) => l.id === lessonId);
    }
    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', lessonId || 'unknown');
    }

    const userId = req.user!.userId;

    // 1. Locate or auto-provision virtual database
    let vdb: any = null;
    if (databaseId) {
      vdb = await db.collection('virtual_databases').findOne({ id: databaseId, userId });
    }
    if (!vdb) {
      const user = await db.collection('users').findOne({ id: userId });
      if (user?.activeDatabaseId) {
        vdb = await db.collection('virtual_databases').findOne({ id: user.activeDatabaseId, userId });
      }
    }
    if (!vdb) {
      vdb = await db.collection('virtual_databases').findOne({ userId });
    }
    if (!vdb) {
      // Auto-provision workspace & database for this student
      const wsId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.collection('workspaces').insertOne({
        id: wsId,
        userId,
        name: 'Academic Lab Workspace',
        description: 'Auto-provisioned workspace for curriculum practicals',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const dbId = `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const physicalNamespace = `dc_${wsId}_${dbId}`;
      vdb = {
        id: dbId,
        workspaceId: wsId,
        userId,
        name: 'CollegeDB',
        physicalDatabaseName: physicalNamespace,
        physicalNamespace,
        status: 'active' as const,
        description: 'Auto-provisioned sandbox database for MongoDB practicals',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('virtual_databases').insertOne(vdb);
      await db.collection('users').updateOne(
        { id: userId },
        { $set: { activeDatabaseId: dbId, activeWorkspaceId: wsId } }
      );
    }

    // 2. Ensure target collection exists with standard sample documents
    const targetCollection = lesson.practiceCollection || 'students';
    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);
    const col = userDb.collection(targetCollection);

    const docCount = await col.countDocuments();
    if (docCount === 0 && targetCollection === 'students') {
      await col.insertMany([
        {
          studentId: 'STU-101',
          name: 'Alice Johnson',
          age: 20,
          major: 'Computer Science',
          gpa: 3.85,
          enrolledCourses: ['CS101', 'CS204', 'MATH101'],
          status: 'active',
          address: { city: 'Boston', state: 'MA' },
        },
        {
          studentId: 'STU-102',
          name: 'Bob Smith',
          age: 22,
          major: 'Electrical Engineering',
          gpa: 3.42,
          enrolledCourses: ['EE101', 'EE201'],
          status: 'active',
          address: { city: 'Chicago', state: 'IL' },
        },
        {
          studentId: 'STU-103',
          name: 'Carol White',
          age: 19,
          major: 'Computer Science',
          gpa: 3.92,
          enrolledCourses: ['CS101', 'MATH101', 'PHYS101'],
          status: 'active',
          address: { city: 'New York', state: 'NY' },
        },
        {
          studentId: 'STU-104',
          name: 'David Lee',
          age: 23,
          major: 'Data Science',
          gpa: 3.65,
          enrolledCourses: ['DS101', 'CS204'],
          status: 'probation',
          address: { city: 'San Jose', state: 'CA' },
        },
        {
          studentId: 'STU-105',
          name: 'Emma Watson',
          age: 21,
          major: 'Mathematics',
          gpa: 3.78,
          enrolledCourses: ['MATH101', 'MATH202'],
          status: 'active',
          address: { city: 'Seattle', state: 'WA' },
        },
      ]);
    }

    // 3. Parse MQL Query via AST
    const parsed = parseMqlQuery(rawQuery.trim(), vdb.id, targetCollection);
    const queryToRun = parsed.normalized;

    if (!queryToRun || !queryToRun.operation) {
      throw new InvalidRequestError('No valid MongoDB operation parsed from query input');
    }

    const maxTime = config.sandbox.maxQueryExecutionMs || 3000;
    const maxResults = config.sandbox.maxResultDocuments || 100;
    let resultData: any = null;
    let documentsCount = 0;
    let documentsAffected = 0;

    switch (queryToRun.operation) {
      case 'find': {
        const filter = queryToRun.filter || {};
        const projection = queryToRun.projection || {};
        const sort = queryToRun.sort || {};
        const limit = Math.min(queryToRun.limit || maxResults, maxResults);
        const skip = queryToRun.skip || 0;

        let cursor = col.find(filter, { projection }).maxTimeMS(maxTime);
        if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
        if (skip > 0) cursor = cursor.skip(skip);
        cursor = cursor.limit(limit);

        const docs = await cursor.toArray();
        resultData = sanitizeDocumentIds(docs);
        documentsCount = docs.length;
        break;
      }

      case 'findOne': {
        const filter = queryToRun.filter || {};
        const projection = queryToRun.projection || {};
        const doc = await col.findOne(filter, { projection, maxTimeMS: maxTime });
        resultData = sanitizeDocumentIds(doc);
        documentsCount = doc ? 1 : 0;
        break;
      }

      case 'countDocuments': {
        const filter = queryToRun.filter || {};
        const count = await col.countDocuments(filter, { maxTimeMS: maxTime });
        resultData = { count };
        documentsCount = 1;
        break;
      }

      case 'aggregate': {
        const pipeline = queryToRun.pipeline || [];
        const limitedPipeline = [...pipeline];
        if (!limitedPipeline.some((stage: any) => stage.$limit)) {
          limitedPipeline.push({ $limit: maxResults });
        }
        const docs = await col.aggregate(limitedPipeline, { maxTimeMS: maxTime }).toArray();
        resultData = sanitizeDocumentIds(docs);
        documentsCount = docs.length;
        break;
      }

      case 'insertOne': {
        const doc = queryToRun.document || {};
        const insertRes = await col.insertOne(doc);
        resultData = {
          acknowledged: insertRes.acknowledged,
          insertedId: insertRes.insertedId.toString(),
        };
        documentsCount = 1;
        documentsAffected = 1;
        break;
      }

      case 'insertMany': {
        const docs = queryToRun.documents || [];
        const insertRes = await col.insertMany(docs);
        resultData = {
          acknowledged: insertRes.acknowledged,
          insertedCount: insertRes.insertedCount,
          insertedIds: Object.values(insertRes.insertedIds).map((id: any) => id.toString()),
        };
        documentsCount = insertRes.insertedCount;
        documentsAffected = insertRes.insertedCount;
        break;
      }

      case 'updateOne': {
        const filter = queryToRun.filter || {};
        const update = queryToRun.update || {};
        const updateRes = await col.updateOne(filter, update);
        resultData = {
          acknowledged: updateRes.acknowledged,
          matchedCount: updateRes.matchedCount,
          modifiedCount: updateRes.modifiedCount,
        };
        documentsAffected = updateRes.modifiedCount;
        break;
      }

      case 'updateMany': {
        const filter = queryToRun.filter || {};
        const update = queryToRun.update || {};
        const updateRes = await col.updateMany(filter, update);
        resultData = {
          acknowledged: updateRes.acknowledged,
          matchedCount: updateRes.matchedCount,
          modifiedCount: updateRes.modifiedCount,
        };
        documentsAffected = updateRes.modifiedCount;
        break;
      }

      case 'deleteOne': {
        const filter = queryToRun.filter || {};
        const deleteRes = await col.deleteOne(filter);
        resultData = {
          acknowledged: deleteRes.acknowledged,
          deletedCount: deleteRes.deletedCount,
        };
        documentsAffected = deleteRes.deletedCount;
        break;
      }

      case 'deleteMany': {
        const filter = queryToRun.filter || {};
        const deleteRes = await col.deleteMany(filter);
        resultData = {
          acknowledged: deleteRes.acknowledged,
          deletedCount: deleteRes.deletedCount,
        };
        documentsAffected = deleteRes.deletedCount;
        break;
      }

      default:
        throw new InvalidRequestError(`Operation ${queryToRun.operation} is not supported in practical mode`);
    }

    const executionTimeMs = Date.now() - startTime;

    // 4. Record Query Telemetry in query_history
    const nowIso = new Date().toISOString();
    await db.collection('query_history').insertOne({
      id: `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      databaseId: vdb.id,
      databaseName: vdb.name,
      collection: targetCollection,
      collectionName: targetCollection,
      rawQuery: rawQuery.trim(),
      operation: queryToRun.operation,
      executionTimeMs,
      durationMs: executionTimeMs,
      documentsCount,
      documentsReturned: documentsCount,
      documentsAffected,
      status: 'success',
      success: true,
      createdAt: nowIso,
      timestamp: nowIso,
      executedAt: nowIso,
    });

    // 5. Award completion XP if first time
    let xpAwarded = 0;
    const progress = await db.collection('lesson_progress').findOne({ userId, lessonId: lesson.id });
    if (!progress || !progress.completed) {
      xpAwarded = lesson.xpReward || 50;
      await db.collection('lesson_progress').updateOne(
        { userId, lessonId: lesson.id },
        {
          $set: {
            userId,
            lessonId: lesson.id,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      await db.collection(PLATFORM_COLLECTIONS.LEARNING_PROGRESS).updateOne(
        { userId, lessonId: lesson.id },
        {
          $set: {
            userId,
            lessonId: lesson.id,
            completed: true,
            progressPercent: 100,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      await db.collection('users').updateOne(
        { id: userId },
        { $inc: { xp: xpAwarded }, $set: { updatedAt: new Date().toISOString() } }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        result: resultData,
        documentsCount,
        documentsAffected,
        executionTimeMs,
        syntaxBreakdown: parsed.breakdown,
        targetDatabase: vdb.name,
        databaseId: vdb.id,
        collection: targetCollection,
        xpAwarded,
        lessonCompleted: true,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

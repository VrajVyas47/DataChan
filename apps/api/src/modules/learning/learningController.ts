import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, Lesson } from '@datachan/shared-types';
import { CURRICULUM_LESSONS } from './curriculumSeed';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';
import { parseMqlQuery } from '../../security/queryParser';
import { sanitizeDocumentIds } from '../playground/playgroundController';
import { config } from '../../config';

export async function listLessons(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const progressList = await db
      .collection('lesson_progress')
      .find({ userId: req.user!.userId })
      .toArray();

    const progressMap = new Map<string, boolean>();
    for (const p of progressList) {
      if (p.completed) {
        progressMap.set(p.lessonId, true);
      }
    }

    const lessonsWithStatus = CURRICULUM_LESSONS.map((lesson) => ({
      ...lesson,
      completed: progressMap.has(lesson.id),
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: lessonsWithStatus,
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
    const lesson = CURRICULUM_LESSONS.find((l) => l.id === id);

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const db = getPlatformDb();
    const progress = await db
      .collection('lesson_progress')
      .findOne({ userId: req.user!.userId, lessonId: id });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...lesson,
        completed: progress?.completed || false,
      },
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
    const lesson = CURRICULUM_LESSONS.find((l) => l.id === id);

    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', id);
    }

    const db = getPlatformDb();
    const existing = await db
      .collection('lesson_progress')
      .findOne({ userId: req.user!.userId, lessonId: id });

    let xpAwarded = 0;
    if (!existing || !existing.completed) {
      xpAwarded = lesson.xpReward;
      await db.collection('lesson_progress').updateOne(
        { userId: req.user!.userId, lessonId: id },
        {
          $set: {
            userId: req.user!.userId,
            lessonId: id,
            completed: true,
            completedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      // Award XP to user and update level
      await db.collection('users').updateOne(
        { id: req.user!.userId },
        {
          $inc: { xp: xpAwarded },
          $set: { updatedAt: new Date().toISOString() },
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

    const lesson = CURRICULUM_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) {
      throw new ResourceNotFoundError('Lesson', lessonId || 'unknown');
    }

    const db = getPlatformDb();
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
        physicalNamespace,
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
    await db.collection('query_history').insertOne({
      id: `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      databaseId: vdb.id,
      databaseName: vdb.name,
      collectionName: targetCollection,
      rawQuery: rawQuery.trim(),
      operation: queryToRun.operation,
      executionTimeMs,
      documentsCount,
      documentsAffected,
      status: 'success',
      executedAt: new Date().toISOString(),
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

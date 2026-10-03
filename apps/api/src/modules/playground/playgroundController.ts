import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient, getMongoServerVersion } from '../../database/mongoClient';
import {
  ApiResponse,
  QueryResult,
  ExecutionStats,
} from '@datachan/shared-types';
import { parseMqlQuery } from '../../security/queryParser';
import {
  InvalidRequestError,
  ResourceNotFoundError,
  AuthorizationError,
  ExecutionTimeoutError,
} from '../../errors';
import { config } from '../../config';

export function sanitizeDocumentIds(item: any): any {
  if (item === null || item === undefined) return item;
  if (Array.isArray(item)) {
    return item.map(sanitizeDocumentIds);
  }
  if (typeof item === 'object') {
    if (item._bsontype === 'ObjectId' || (item.toHexString && typeof item.toHexString === 'function')) {
      return item.toString();
    }
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      sanitized[k] = sanitizeDocumentIds(v);
    }
    return sanitized;
  }
  return item;
}

export async function executeQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  let rawQuery = '';
  let collectionName = '';
  let targetDbId = '';

  try {
    const { databaseId, collection, rawQuery: inputQuery, normalizedQuery } = req.body;
    rawQuery = inputQuery || '';
    targetDbId = databaseId;

    if (!databaseId) {
      throw new InvalidRequestError('databaseId is required for query execution');
    }

    // Verify database ownership
    const platformDb = getPlatformDb();
    const vdb = await platformDb.collection('virtual_databases').findOne({ id: databaseId });
    if (!vdb) {
      throw new ResourceNotFoundError('Virtual Database', databaseId);
    }
    if (vdb.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not have access to this virtual database');
    }

    // Parse & normalize query safely via AST if rawQuery provided
    let queryToRun = normalizedQuery;
    let syntaxBreakdown: any[] = [];

    if (rawQuery) {
      const parsed = parseMqlQuery(rawQuery, databaseId, collection);
      queryToRun = parsed.normalized;
      syntaxBreakdown = parsed.breakdown;
    }

    if (!queryToRun || !queryToRun.operation) {
      throw new InvalidRequestError('No valid MongoDB operation parsed from query input');
    }

    collectionName = queryToRun.collection || collection || 'default';
    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);
    const col = userDb.collection(collectionName);

    const maxTime = config.sandbox.maxQueryExecutionMs;
    const maxResults = config.sandbox.maxResultDocuments;

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
        if (Object.keys(sort).length > 0) {
          cursor = cursor.sort(sort);
        }
        if (skip > 0) {
          cursor = cursor.skip(skip);
        }
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

      case 'insertOne': {
        const doc = queryToRun.document || {};
        const docBytes = Buffer.byteLength(JSON.stringify(doc));
        if (docBytes > config.sandbox.maxDocumentSizeBytes) {
          throw new InvalidRequestError(
            `Document size (${docBytes} bytes) exceeds sandbox limit of ${config.sandbox.maxDocumentSizeBytes} bytes`
          );
        }
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
        if (docs.length > 50) {
          throw new InvalidRequestError('insertMany in sandbox allows maximum 50 documents per call.');
        }
        for (const doc of docs) {
          const docBytes = Buffer.byteLength(JSON.stringify(doc));
          if (docBytes > config.sandbox.maxDocumentSizeBytes) {
            throw new InvalidRequestError(
              `Document size (${docBytes} bytes) in insertMany exceeds sandbox limit of ${config.sandbox.maxDocumentSizeBytes} bytes`
            );
          }
        }
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
          upsertedId: updateRes.upsertedId?.toString() || null,
        };
        documentsCount = updateRes.matchedCount;
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
        documentsCount = updateRes.matchedCount;
        documentsAffected = updateRes.modifiedCount;
        break;
      }

      case 'deleteOne': {
        const filter = queryToRun.filter || {};
        const delRes = await col.deleteOne(filter);
        resultData = {
          acknowledged: delRes.acknowledged,
          deletedCount: delRes.deletedCount,
        };
        documentsCount = delRes.deletedCount;
        documentsAffected = delRes.deletedCount;
        break;
      }

      case 'deleteMany': {
        const filter = queryToRun.filter || {};
        const delRes = await col.deleteMany(filter);
        resultData = {
          acknowledged: delRes.acknowledged,
          deletedCount: delRes.deletedCount,
        };
        documentsCount = delRes.deletedCount;
        documentsAffected = delRes.deletedCount;
        break;
      }

      case 'aggregate': {
        const pipeline = queryToRun.pipeline || [];
        // Enforce max stage limits
        if (pipeline.length > 15) {
          throw new InvalidRequestError('Aggregation pipeline exceeds sandbox limit of 15 stages.');
        }
        // Append limit stage if not present to protect memory
        const hasLimit = pipeline.some((stage: any) => stage.$limit !== undefined);
        const effectivePipeline = hasLimit ? pipeline : [...pipeline, { $limit: maxResults }];

        const aggCursor = col.aggregate(effectivePipeline, { maxTimeMS: maxTime });
        const aggDocs = await aggCursor.toArray();
        resultData = sanitizeDocumentIds(aggDocs);
        documentsCount = aggDocs.length;
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    const stats: ExecutionStats = {
      durationMs,
      documentsReturned: documentsCount,
      documentsAffected,
      isTruncated: documentsCount >= maxResults,
    };

    // Record query history (Section 13)
    const nowIso = new Date().toISOString();
    const historyId = `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const historyDoc = {
      id: historyId,
      userId: req.user!.userId,
      workspaceId: vdb.workspaceId,
      databaseId: vdb.id,
      collection: collectionName,
      collectionName,
      rawQuery: rawQuery || JSON.stringify(queryToRun),
      operation: queryToRun.operation,
      executionTimeMs: durationMs,
      durationMs,
      documentsReturned: documentsCount,
      documentsCount,
      documentsAffected,
      status: 'success' as const,
      success: true,
      createdAt: nowIso,
      timestamp: nowIso,
      executedAt: nowIso,
    };

    await platformDb.collection('query_history').insertOne(historyDoc).catch((err) => {
      console.error('[playground] Failed to record query history:', err.message);
    });

    // Update user queries count
    platformDb.collection('users').updateOne(
      { id: req.user!.userId },
      { $inc: { queriesExecutedCount: 1 } }
    ).catch(() => {});

    const queryResult: QueryResult = {
      operation: queryToRun.operation,
      collection: collectionName,
      data: resultData,
      stats,
      breakdown: syntaxBreakdown,
      historyItem: {
        id: historyId,
        userId: req.user!.userId,
        workspaceId: vdb.workspaceId,
        databaseId: vdb.id,
        collection: collectionName,
        rawQuery: rawQuery || JSON.stringify(queryToRun),
        operation: queryToRun.operation,
        durationMs,
        executionTimeMs: durationMs,
        documentsReturned: documentsCount,
        documentsCount,
        success: true,
        status: 'success',
        timestamp: nowIso,
        createdAt: nowIso,
      },
    };

    const response: ApiResponse<QueryResult> = {
      success: true,
      data: queryResult,
      error: null,
    };
    res.json(response);
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    // Log failed query to history
    if (req.user) {
      const errNowIso = new Date().toISOString();
      await getPlatformDb()
        .collection('query_history')
        .insertOne({
          id: `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: req.user.userId,
          databaseId: targetDbId || 'default',
          collection: collectionName || 'default',
          collectionName: collectionName || 'default',
          rawQuery,
          operation: 'find',
          executionTimeMs: durationMs,
          durationMs,
          documentsReturned: 0,
          documentsCount: 0,
          documentsAffected: 0,
          status: 'error',
          success: false,
          errorCode: err.code || 'INVALID_QUERY',
          errorMessage: err.message,
          createdAt: errNowIso,
          timestamp: errNowIso,
          executedAt: errNowIso,
        })
        .catch(() => {});
    }

    if (err.message && err.message.includes('execution exceeded time limit')) {
      return next(new ExecutionTimeoutError(config.sandbox.maxQueryExecutionMs));
    }
    next(err);
  }
}

export async function analyzeQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rawQuery, databaseId, collection } = req.body;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      res.json({
        success: true,
        data: { breakdown: [], normalized: null, error: null },
        error: null,
      });
      return;
    }

    try {
      const parsed = parseMqlQuery(rawQuery.trim(), databaseId || 'default', collection || 'students');
      res.json({
        success: true,
        data: {
          breakdown: parsed.breakdown,
          normalized: parsed.normalized,
          error: null,
        },
        error: null,
      });
    } catch (parseErr: any) {
      // Incomplete syntax or parser error during typing: return graceful feedback without 400 crash
      res.json({
        success: true,
        data: {
          breakdown: [],
          normalized: null,
          error: parseErr.message,
        },
        error: null,
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function getPlaygroundStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverVersion = await getMongoServerVersion();
    res.json({
      success: true,
      data: {
        serverVersion,
        storageEngine: 'WiredTiger',
        status: 'connected',
        limits: {
          maxQueryExecutionMs: config.sandbox.maxQueryExecutionMs,
          maxResultDocuments: config.sandbox.maxResultDocuments,
          maxDocumentSizeBytes: config.sandbox.maxDocumentSizeBytes,
        },
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

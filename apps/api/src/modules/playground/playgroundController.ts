import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
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
    const { databaseId, collection, rawQuery: inputQuery } = req.body;
    rawQuery = inputQuery || '';
    targetDbId = databaseId;

    if (!databaseId) {
      throw new InvalidRequestError('databaseId is required for query execution');
    }

    if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
      throw new InvalidRequestError('rawQuery is required for query execution. Submit a valid MQL query string.');
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

    // SECURITY: Always parse & normalize through the server-side AST parser.
    // Client-supplied normalizedQuery is NEVER trusted — all queries must pass
    // through parseMqlQuery which enforces the operator whitelist and blocks
    // forbidden operators ($where, $out, $merge, $function, etc.).
    const parsed = parseMqlQuery(rawQuery, databaseId, collection);
    const queryToRun = parsed.normalized;
    const syntaxBreakdown = parsed.breakdown;

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

    // Asynchronously record query history (Section 13)
    const historyId = `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    platformDb.collection('query_history').insertOne({
      id: historyId,
      userId: req.user!.userId,
      workspaceId: vdb.workspaceId,
      databaseId: vdb.id,
      collection: collectionName,
      rawQuery: rawQuery || JSON.stringify(queryToRun),
      operation: queryToRun.operation,
      durationMs,
      documentsReturned: documentsCount,
      success: true,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

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
      getPlatformDb()
        .collection('query_history')
        .insertOne({
          id: `qh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: req.user.userId,
          databaseId: targetDbId,
          collection: collectionName,
          rawQuery,
          operation: 'find',
          durationMs,
          documentsReturned: 0,
          success: false,
          errorCode: err.code || 'INVALID_QUERY',
          errorMessage: err.message,
          timestamp: new Date().toISOString(),
        })
        .catch(() => {});
    }

    if (err.message && err.message.includes('execution exceeded time limit')) {
      return next(new ExecutionTimeoutError(config.sandbox.maxQueryExecutionMs));
    }
    next(err);
  }
}

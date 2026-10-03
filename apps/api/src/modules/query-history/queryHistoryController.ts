import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, QueryHistoryItem } from '@datachan/shared-types';

export async function getQueryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    // Prevent browser and proxy caching of real-time user query history
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const history = await db
      .collection('query_history')
      .find({ userId: req.user!.userId })
      .sort({ createdAt: -1, timestamp: -1, _id: -1 })
      .limit(limit)
      .toArray();

    const formatted: QueryHistoryItem[] = history.map((item: any) => {
      const stableId = item.id || (item._id ? item._id.toString() : `qh_${Math.random().toString(36).substring(2, 9)}`);
      const duration = item.durationMs ?? item.executionTimeMs ?? 0;
      const docsCount = item.documentsReturned ?? item.documentsCount ?? 0;
      const isSuccess = item.success ?? (item.status === 'success');
      const timeIso = item.timestamp || item.createdAt || item.executedAt || new Date().toISOString();

      return {
        id: String(stableId),
        userId: item.userId,
        workspaceId: item.workspaceId || '',
        databaseId: item.databaseId || '',
        collection: item.collection || item.collectionName || 'students',
        rawQuery: item.rawQuery || item.queryText || '',
        operation: item.operation || 'find',
        durationMs: duration,
        executionTimeMs: duration,
        documentsReturned: docsCount,
        documentsCount: docsCount,
        success: isSuccess,
        status: item.status || (isSuccess ? 'success' : 'error'),
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        timestamp: timeIso,
        createdAt: timeIso,
      };
    });

    const response: ApiResponse<QueryHistoryItem[]> = {
      success: true,
      data: formatted,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function clearQueryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    await db.collection('query_history').deleteMany({ userId: req.user!.userId });

    const response: ApiResponse = {
      success: true,
      data: { cleared: true },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

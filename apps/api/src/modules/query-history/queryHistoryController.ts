import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, QueryHistoryItem } from '@datachan/shared-types';

export async function getQueryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    const history = await db
      .collection('query_history')
      .find({ userId: req.user!.userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const formatted: QueryHistoryItem[] = history.map((item: any) => ({
      id: item.id,
      userId: item.userId,
      workspaceId: item.workspaceId,
      databaseId: item.databaseId,
      collection: item.collection,
      rawQuery: item.rawQuery,
      operation: item.operation,
      durationMs: item.durationMs,
      documentsReturned: item.documentsReturned,
      success: item.success,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      timestamp: item.timestamp,
    }));

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

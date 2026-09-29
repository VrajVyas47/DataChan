import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, CollectionMetadata, DetectedFieldInfo } from '@datachan/shared-types';
import {
  InvalidRequestError,
  ResourceNotFoundError,
  AuthorizationError,
  InvalidCollectionError,
} from '../../errors';

async function getAuthorizedDbNamespace(databaseId: string, userId: string): Promise<string> {
  const db = getPlatformDb();
  const vdb = await db.collection('virtual_databases').findOne({ id: databaseId });
  if (!vdb) {
    throw new ResourceNotFoundError('Virtual Database', databaseId);
  }
  if (vdb.userId !== userId) {
    throw new AuthorizationError('You do not have access to this virtual database');
  }
  return vdb.physicalNamespace;
}

export async function listCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawDbId = req.params.databaseId || req.query.databaseId;
    const databaseId = String(rawDbId || '');
    if (!databaseId) {
      throw new InvalidRequestError('databaseId parameter is required');
    }

    const namespace = await getAuthorizedDbNamespace(databaseId, req.user!.userId);
    const client = getMongoClient();
    const userDb = client.db(namespace);

    const cols = await userDb.listCollections().toArray();
    const enriched: CollectionMetadata[] = await Promise.all(
      cols.map(async (col) => {
        let count = 0;
        try {
          count = await userDb.collection(col.name).estimatedDocumentCount();
        } catch {
          // ignore
        }
        return {
          name: col.name,
          databaseId,
          documentsCount: count,
        };
      })
    );

    const response: ApiResponse<CollectionMetadata[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawDbId = req.params.databaseId || req.body.databaseId;
    const databaseId = String(rawDbId || '');
    const { name } = req.body;

    if (!databaseId) {
      throw new InvalidRequestError('databaseId is required');
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new InvalidRequestError('Collection name is required');
    }

    const cleanName = name.trim();
    if (cleanName.startsWith('system.') || cleanName.includes('$')) {
      throw new InvalidCollectionError(cleanName);
    }

    const namespace = await getAuthorizedDbNamespace(databaseId, req.user!.userId);
    const client = getMongoClient();
    const userDb = client.db(namespace);

    await userDb.createCollection(cleanName);

    // Update active collection on user
    await getPlatformDb()
      .collection('users')
      .updateOne({ id: req.user!.userId }, { $set: { activeCollectionName: cleanName } });

    const response: ApiResponse<CollectionMetadata> = {
      success: true,
      data: {
        name: cleanName,
        databaseId,
        documentsCount: 0,
      },
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function inspectCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');

    const namespace = await getAuthorizedDbNamespace(databaseId, req.user!.userId);
    const client = getMongoClient();
    const userDb = client.db(namespace);
    const col = userDb.collection(name);

    const count = await col.countDocuments();
    const samples = await col.find().limit(50).toArray();

    // Analyze detected fields across sample documents
    const fieldMap = new Map<string, { types: Set<string>; count: number; example: any }>();

    for (const doc of samples) {
      for (const [key, value] of Object.entries(doc)) {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { types: new Set<string>(), count: 0, example: value });
        }
        const entry = fieldMap.get(key)!;
        entry.count++;

        if (value === null || value === undefined) {
          entry.types.add('Null');
        } else if (Array.isArray(value)) {
          entry.types.add('Array');
        } else if (value._bsontype === 'ObjectId' || (typeof value === 'object' && value.toHexString)) {
          entry.types.add('ObjectId');
        } else if (typeof value === 'number') {
          entry.types.add('Number');
        } else if (typeof value === 'boolean') {
          entry.types.add('Boolean');
        } else if (value instanceof Date) {
          entry.types.add('Date');
        } else if (typeof value === 'object') {
          entry.types.add('Object');
        } else {
          entry.types.add('String');
        }
      }
    }

    const detectedFields: DetectedFieldInfo[] = Array.from(fieldMap.entries()).map(([k, v]) => ({
      name: k,
      types: Array.from(v.types),
      isArray: v.types.has('Array'),
      isObject: v.types.has('Object'),
      isObjectId: v.types.has('ObjectId') || k === '_id',
      presencePercent: samples.length > 0 ? Math.round((v.count / samples.length) * 100) : 0,
      exampleValue: v.example,
    }));

    const metadata: CollectionMetadata = {
      name,
      databaseId,
      documentsCount: count,
      detectedFields,
    };

    const response: ApiResponse<CollectionMetadata> = {
      success: true,
      data: metadata,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');

    const namespace = await getAuthorizedDbNamespace(databaseId, req.user!.userId);
    const client = getMongoClient();
    const userDb = client.db(namespace);

    await userDb.collection(name).drop();

    const response: ApiResponse = {
      success: true,
      data: { dropped: true, collection: name },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

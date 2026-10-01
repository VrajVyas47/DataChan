import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, DocumentItem } from '@datachan/shared-types';
import {
  InvalidRequestError,
  ResourceNotFoundError,
  AuthorizationError,
  QueryLimitExceededError,
} from '../../errors';
import { config } from '../../config';

async function getAuthorizedCollection(
  databaseId: string,
  collectionName: string,
  userId: string
) {
  const db = getPlatformDb();
  const vdb = await db.collection('virtual_databases').findOne({ id: databaseId });
  if (!vdb) {
    throw new ResourceNotFoundError('Virtual Database', databaseId);
  }
  if (vdb.userId !== userId) {
    throw new AuthorizationError('You do not have access to this virtual database');
  }

  const client = getMongoClient();
  const userDb = client.db(vdb.physicalNamespace);
  return userDb.collection(collectionName);
}

function parseObjectId(idStr: string): ObjectId | string {
  if (ObjectId.isValid(idStr) && idStr.length === 24) {
    try {
      return new ObjectId(idStr);
    } catch {
      return idStr;
    }
  }
  return idStr;
}

/**
 * Escapes regex special characters in a string to prevent ReDoS and regex injection.
 * Converts user input into a safe literal pattern for MongoDB $regex queries.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      config.sandbox.maxResultDocuments,
      Math.max(1, parseInt((req.query.limit as string) || '50', 10))
    );
    const search = req.query.search as string;

    const col = await getAuthorizedCollection(databaseId, name, req.user!.userId);

    const filter: Record<string, any> = {};
    if (search && search.trim().length > 0) {
      // SECURITY: Escape regex special characters to prevent ReDoS and regex injection.
      // Limit search length to prevent overly complex patterns.
      const safeSearch = escapeRegex(search.trim().substring(0, 200));
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { title: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const totalCount = await col.countDocuments(filter);
    const docs = await col
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Map _id to clean string representation
    const formattedDocs: DocumentItem[] = docs.map((doc) => ({
      ...doc,
      _id: String(doc._id?.toString() || doc._id),
    }));

    const response: ApiResponse<{
      documents: DocumentItem[];
      totalCount: number;
      page: number;
      limit: number;
      totalPages: number;
    }> = {
      success: true,
      data: {
        documents: formattedDocs,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function insertDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');
    const document = req.body;

    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      throw new InvalidRequestError('A single valid JSON object document is required');
    }

    const jsonSize = Buffer.byteLength(JSON.stringify(document));
    if (jsonSize > config.sandbox.maxDocumentSizeBytes) {
      throw new QueryLimitExceededError(
        `Document size (${jsonSize} bytes) exceeds maximum allowed limit of ${config.sandbox.maxDocumentSizeBytes} bytes`
      );
    }

    const col = await getAuthorizedCollection(databaseId, name, req.user!.userId);

    const docToInsert = { ...document };
    if (docToInsert._id && typeof docToInsert._id === 'string' && ObjectId.isValid(docToInsert._id)) {
      docToInsert._id = new ObjectId(docToInsert._id);
    }

    const result = await col.insertOne(docToInsert);
    const insertedDoc = await col.findOne({ _id: result.insertedId });

    const response: ApiResponse<DocumentItem> = {
      success: true,
      data: {
        ...insertedDoc,
        _id: String(insertedDoc?._id?.toString() || result.insertedId.toString()),
      },
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');
    const docId = String(req.params.docId || '');
    const updatePayload = req.body;

    if (!updatePayload || typeof updatePayload !== 'object') {
      throw new InvalidRequestError('Valid update fields are required');
    }

    const col = await getAuthorizedCollection(databaseId, name, req.user!.userId);
    const targetId = parseObjectId(docId);

    const { _id, ...fieldsToUpdate } = updatePayload;

    const updateDoc = fieldsToUpdate.$set
      ? fieldsToUpdate
      : { $set: fieldsToUpdate };

    const result = await col.updateOne({ _id: targetId as any }, updateDoc);
    if (result.matchedCount === 0) {
      throw new ResourceNotFoundError('Document', docId);
    }

    const updatedDoc = await col.findOne({ _id: targetId as any });

    const response: ApiResponse<DocumentItem> = {
      success: true,
      data: {
        ...updatedDoc,
        _id: String(updatedDoc?._id?.toString() || docId),
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const databaseId = String(req.params.databaseId || '');
    const name = String(req.params.name || '');
    const docId = String(req.params.docId || '');
    const col = await getAuthorizedCollection(databaseId, name, req.user!.userId);
    const targetId = parseObjectId(docId);

    const result = await col.deleteOne({ _id: targetId as any });
    if (result.deletedCount === 0) {
      throw new ResourceNotFoundError('Document', docId);
    }

    const response: ApiResponse = {
      success: true,
      data: { deleted: true, docId },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, VirtualDatabase } from '@datachan/shared-types';
import { InvalidRequestError, ResourceNotFoundError, AuthorizationError } from '../../errors';

export async function listDatabases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const rawWorkspaceId = req.query.workspaceId || req.params.workspaceId;
    const workspaceId = rawWorkspaceId ? String(rawWorkspaceId) : undefined;

    const filter: Record<string, any> = { userId: req.user!.userId };
    if (workspaceId) {
      filter.workspaceId = workspaceId;
    }

    const virtualDbs = await db.collection('virtual_databases').find(filter).toArray();
    const client = getMongoClient();

    // Enrich with live collection and document counts from actual MongoDB
    const enriched = await Promise.all(
      virtualDbs.map(async (vdb: any) => {
        try {
          const userDb = client.db(vdb.physicalNamespace);
          const cols = await userDb.listCollections().toArray();
          let totalDocs = 0;
          for (const col of cols) {
            try {
              totalDocs += await userDb.collection(col.name).estimatedDocumentCount();
            } catch {
              // ignore count error
            }
          }
          return {
            id: vdb.id,
            workspaceId: vdb.workspaceId,
            userId: vdb.userId,
            name: vdb.name,
            physicalNamespace: vdb.physicalNamespace,
            description: vdb.description,
            createdAt: vdb.createdAt,
            updatedAt: vdb.updatedAt,
            collectionsCount: cols.length,
            totalDocumentsCount: totalDocs,
          };
        } catch {
          return {
            id: vdb.id,
            workspaceId: vdb.workspaceId,
            userId: vdb.userId,
            name: vdb.name,
            physicalNamespace: vdb.physicalNamespace,
            description: vdb.description,
            createdAt: vdb.createdAt,
            updatedAt: vdb.updatedAt,
            collectionsCount: 0,
            totalDocumentsCount: 0,
          };
        }
      })
    );

    const response: ApiResponse<VirtualDatabase[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, workspaceId, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new InvalidRequestError('Database name is required');
    }
    if (!workspaceId) {
      throw new InvalidRequestError('Target workspace ID is required');
    }

    const db = getPlatformDb();

    // Verify workspace ownership
    const workspace = await db.collection('workspaces').findOne({ id: workspaceId });
    if (!workspace) {
      throw new ResourceNotFoundError('Workspace', workspaceId);
    }
    if (workspace.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this workspace');
    }

    const databaseId = `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const physicalNamespace = `dc_${workspaceId}_${databaseId}`;

    const newDb: VirtualDatabase = {
      id: databaseId,
      workspaceId,
      userId: req.user!.userId,
      name: name.trim(),
      physicalNamespace,
      status: 'active',
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collectionsCount: 0,
      totalDocumentsCount: 0,
    };

    await db.collection('virtual_databases').insertOne(newDb);

    // Update active database for user
    await db.collection('users').updateOne(
      { id: req.user!.userId },
      { $set: { activeDatabaseId: databaseId, updatedAt: new Date().toISOString() } }
    );

    const response: ApiResponse<VirtualDatabase> = {
      success: true,
      data: newDb,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const vdb = await db.collection('virtual_databases').findOne({ id });

    if (!vdb) {
      throw new ResourceNotFoundError('Virtual Database', id);
    }
    if (vdb.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this database');
    }

    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);
    const cols = await userDb.listCollections().toArray();
    let totalDocs = 0;
    for (const col of cols) {
      totalDocs += await userDb.collection(col.name).estimatedDocumentCount();
    }

    const response: ApiResponse<VirtualDatabase> = {
      success: true,
      data: {
        id: vdb.id,
        workspaceId: vdb.workspaceId,
        userId: vdb.userId,
        name: vdb.name,
        physicalNamespace: vdb.physicalNamespace,
        description: vdb.description,
        createdAt: vdb.createdAt,
        updatedAt: vdb.updatedAt,
        collectionsCount: cols.length,
        totalDocumentsCount: totalDocs,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const vdb = await db.collection('virtual_databases').findOne({ id });

    if (!vdb) {
      throw new ResourceNotFoundError('Virtual Database', id);
    }
    if (vdb.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this database');
    }

    const client = getMongoClient();
    try {
      await client.db(vdb.physicalNamespace).dropDatabase();
    } catch {
      // ignore
    }

    await db.collection('virtual_databases').deleteOne({ id: vdb.id });

    const response: ApiResponse = {
      success: true,
      data: { deleted: true, databaseId: vdb.id },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

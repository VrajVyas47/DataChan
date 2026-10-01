import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, Workspace } from '@datachan/shared-types';
import { InvalidRequestError, ResourceNotFoundError, AuthorizationError } from '../../errors';

export async function listWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const workspaces = await db
      .collection('workspaces')
      .find({ userId: req.user!.userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Attach databases count to each workspace
    const enriched = await Promise.all(
      workspaces.map(async (ws: any) => {
        const dbsCount = await db
          .collection('virtual_databases')
          .countDocuments({ workspaceId: ws.id, userId: req.user!.userId });
        return {
          id: ws.id,
          userId: ws.userId,
          name: ws.name,
          description: ws.description,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
          databasesCount: dbsCount,
        };
      })
    );

    const response: ApiResponse<Workspace[]> = {
      success: true,
      data: enriched,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new InvalidRequestError('Workspace name is required');
    }

    const db = getPlatformDb();
    const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newWorkspace: Workspace = {
      id: workspaceId,
      userId: req.user!.userId,
      name: name.trim(),
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      databasesCount: 0,
    };

    await db.collection('workspaces').insertOne(newWorkspace);

    // Set as active workspace
    await db.collection('users').updateOne(
      { id: req.user!.userId },
      { $set: { activeWorkspaceId: workspaceId, updatedAt: new Date().toISOString() } }
    );

    const response: ApiResponse<Workspace> = {
      success: true,
      data: newWorkspace,
      error: null,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const workspace = await db.collection('workspaces').findOne({ id });

    if (!workspace) {
      throw new ResourceNotFoundError('Workspace', id);
    }

    if (workspace.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this workspace');
    }

    const dbsCount = await db
      .collection('virtual_databases')
      .countDocuments({ workspaceId: workspace.id });

    const response: ApiResponse<Workspace> = {
      success: true,
      data: {
        id: workspace.id,
        userId: workspace.userId,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        databasesCount: dbsCount,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const workspace = await db.collection('workspaces').findOne({ id });

    if (!workspace) {
      throw new ResourceNotFoundError('Workspace', id);
    }

    if (workspace.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this workspace');
    }

    // Drop all physical databases belonging to this workspace
    const virtualDbs = await db
      .collection('virtual_databases')
      .find({ workspaceId: workspace.id })
      .toArray();

    const client = getMongoClient();
    for (const vdb of virtualDbs) {
      try {
        await client.db(vdb.physicalNamespace).dropDatabase();
      } catch {
        // ignore
      }
    }

    // Delete metadata
    await db.collection('virtual_databases').deleteMany({ workspaceId: workspace.id });
    await db.collection('workspaces').deleteOne({ id: workspace.id });

    const response: ApiResponse = {
      success: true,
      data: { deleted: true, workspaceId: workspace.id },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

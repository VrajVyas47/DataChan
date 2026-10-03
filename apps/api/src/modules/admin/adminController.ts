import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient, getMongoServerVersion } from '../../database/mongoClient';
import { ApiResponse, UserRole } from '@datachan/shared-types';
import { ResourceNotFoundError, InvalidRequestError, AuthorizationError } from '../../errors';
import { getFirebaseAuth } from '../../security/firebaseAdmin';
import { logSecurityEvent } from '../../security/audit';

export async function getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const client = getMongoClient();

    const [
      totalUsers,
      totalDatabases,
      totalQueries,
      totalForumPosts,
      studentCount,
      facultyCount,
      adminCount,
    ] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('virtual_databases').countDocuments(),
      db.collection('query_history').countDocuments(),
      db.collection('forum_posts').countDocuments(),
      db.collection('users').countDocuments({ role: 'student' }),
      db.collection('users').countDocuments({ role: 'faculty' }),
      db.collection('users').countDocuments({ role: 'admin' }),
    ]);

    // Inspect server status
    let serverStatus: any = {};
    try {
      serverStatus = await db.command({ serverStatus: 1 });
    } catch {
      serverStatus = { ok: 1 };
    }

    const stats = {
      overview: {
        totalUsers,
        totalDatabases,
        totalQueries,
        totalForumPosts,
      },
      roles: {
        students: studentCount,
        faculty: facultyCount,
        admins: adminCount,
      },
      system: {
        platformDatabase: db.databaseName,
        uptimeSeconds: serverStatus.uptime || 0,
        version: serverStatus.version || (await getMongoServerVersion()),
        connections: serverStatus.connections?.current || 1,
        status: 'HEALTHY',
      },
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function listAdminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const users = await db.collection('users').find().sort({ createdAt: -1 }).limit(100).toArray();

    const cleanUsers = users.map((u) => {
      const { _id, ...rest } = u;
      return rest;
    });

    const response: ApiResponse = {
      success: true,
      data: cleanUsers,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = String(req.params.userId || '');
    const { role } = req.body;

    if (!role || !['student', 'faculty', 'admin'].includes(role)) {
      throw new InvalidRequestError('Valid role (student, faculty, admin) is required');
    }

    const db = getPlatformDb();
    const targetUser = await db.collection('users').findOne({ id: userId });
    if (!targetUser) {
      throw new ResourceNotFoundError('User', userId);
    }

    if (userId === req.user!.userId) {
      throw new AuthorizationError('Administrators cannot modify their own role');
    }

    if (targetUser.role === 'admin') {
      throw new AuthorizationError('Administrators cannot modify the role of another administrator');
    }

    // Last-Active-Admin Protection: Prevent demoting the last active administrator
    if (targetUser.role === 'admin' && role !== 'admin') {
      const activeAdminsCount = await db.collection('users').countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminsCount <= 1) {
        throw new InvalidRequestError('Cannot demote administrator: system must maintain at least one active administrator');
      }
    }

    const previousRole = targetUser.role;

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { id: userId },
        { $set: { role: role as UserRole, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );

    // Propagate new role to Firebase Custom Claims
    if (targetUser.firebaseUid) {
      try {
        const auth = getFirebaseAuth();
        await auth.setCustomUserClaims(targetUser.firebaseUid, { role });
      } catch (claimErr: any) {
        // Log warning if Firebase connection isn't available, MongoDB remains authoritative
      }
    }

    // Record Security Audit Event
    await logSecurityEvent({
      action: 'ROLE_UPDATED',
      userId: req.user!.userId,
      targetUserId: userId,
      details: {
        previousRole,
        newRole: role,
        targetEmail: targetUser.email,
      },
      req,
    });

    const { _id, ...rest } = result as any;
    res.json({
      success: true,
      data: rest,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = String(req.params.userId || '');
    const { status } = req.body;

    if (!status || !['active', 'suspended', 'disabled'].includes(status)) {
      throw new InvalidRequestError('Valid status (active, suspended, disabled) is required');
    }

    if (userId === req.user!.userId && status !== 'active') {
      throw new InvalidRequestError('Administrators cannot suspend or disable their own account');
    }

    const db = getPlatformDb();
    const targetUser = await db.collection('users').findOne({ id: userId });
    if (!targetUser) {
      throw new ResourceNotFoundError('User', userId);
    }

    // Last-Active-Admin Protection: Prevent suspending or disabling the last active administrator
    if (targetUser.role === 'admin' && status !== 'active') {
      const activeAdminsCount = await db.collection('users').countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminsCount <= 1) {
        throw new InvalidRequestError('Cannot suspend or disable administrator: system must maintain at least one active administrator');
      }
    }

    const previousStatus = targetUser.status || 'active';

    const result = await db
      .collection('users')
      .findOneAndUpdate(
        { id: userId },
        { $set: { status, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );

    // If account was disabled or suspended, revoke all active sessions immediately
    if (status !== 'active' && targetUser.firebaseUid) {
      try {
        const auth = getFirebaseAuth();
        await auth.revokeRefreshTokens(targetUser.firebaseUid);
      } catch {
        // ignore
      }
    }

    await logSecurityEvent({
      action: status === 'active' ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_SUSPENDED',
      userId: req.user!.userId,
      targetUserId: userId,
      details: {
        previousStatus,
        newStatus: status,
        targetEmail: targetUser.email,
      },
      req,
    });

    const { _id, ...rest } = result as any;
    res.json({
      success: true,
      data: rest,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function cleanOrphanedDatabases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const client = getMongoClient();

    // 1. Get active physical namespaces recorded in platform DB
    const activeDatabases = await db.collection('virtual_databases').find({}, { projection: { physicalNamespace: 1 } }).toArray();
    const activeSet = new Set(activeDatabases.map((d) => d.physicalNamespace));

    // 2. List all actual physical databases on the MongoDB instance
    const adminDb = client.db('admin');
    let dbsList: { name: string }[] = [];
    try {
      const dbsResult = await adminDb.admin().listDatabases();
      dbsList = dbsResult.databases || [];
    } catch {
      // Fallback
      dbsList = [];
    }

    const orphaned: string[] = [];
    for (const d of dbsList) {
      // Only target DATA-CHAN virtual lab namespaces (starts with dc_)
      if (d.name.startsWith('dc_') && !activeSet.has(d.name)) {
        try {
          await client.db(d.name).dropDatabase();
          orphaned.push(d.name);
        } catch {
          // ignore drop errors
        }
      }
    }

    res.json({
      success: true,
      data: {
        cleanedCount: orphaned.length,
        droppedNamespaces: orphaned,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

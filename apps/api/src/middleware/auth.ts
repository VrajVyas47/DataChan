import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { config } from '../config';
import { AuthenticationError } from '../errors';
import { logger } from '../logging/logger';
import { getPlatformDb } from '../database/mongoClient';

let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
      firebaseInitialized = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize Firebase Admin SDK', err);
    }
  } else {
    logger.warn('Firebase credentials not fully provided. Operating in development authentication mode.');
  }
}

export interface AuthContext {
  userId: string;
  firebaseUid: string;
  email: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  initFirebase();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Check if development mode fallback token is allowed
    if (config.nodeEnv === 'development' || !firebaseInitialized) {
      // Automatic development user provisioning
      const devUid = (req.headers['x-dev-uid'] as string) || 'dev_user_student';
      const devEmail = (req.headers['x-dev-email'] as string) || 'student@data-chan.edu';
      const devName = (req.headers['x-dev-name'] as string) || 'Student Explorer';

      const user = await ensureUserRecord(devUid, devEmail, devName);
      req.user = {
        userId: user.id,
        firebaseUid: devUid,
        email: devEmail,
        username: user.username,
      };
      return next();
    }

    return next(new AuthenticationError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    if (firebaseInitialized) {
      const decoded = await admin.auth().verifyIdToken(token);
      const user = await ensureUserRecord(decoded.uid, decoded.email || 'user@data-chan.edu', decoded.name || 'User');
      req.user = {
        userId: user.id,
        firebaseUid: decoded.uid,
        email: user.email,
        username: user.username,
      };
      next();
    } else {
      // Local dev token support
      const user = await ensureUserRecord(token, `${token}@data-chan.edu`, token);
      req.user = {
        userId: user.id,
        firebaseUid: token,
        email: user.email,
        username: user.username,
      };
      next();
    }
  } catch (err: any) {
    logger.error('Firebase token verification failed', err);
    next(new AuthenticationError('Invalid authentication token', { original: err.message }));
  }
}

async function ensureUserRecord(firebaseUid: string, email: string, displayName: string): Promise<any> {
  const db = getPlatformDb();
  const existing = await db.collection('users').findOne({ firebaseUid });

  if (existing) {
    return existing;
  }

  // Create new user profile with default workspace
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const username = displayName.replace(/\s+/g, '_').toLowerCase() || 'student';

  const newUser: Record<string, any> = {
    id: userId,
    firebaseUid,
    email,
    username,
    displayName,
    xp: 0,
    level: 1,
    streakDays: 1,
    activeWorkspaceId: workspaceId,
    activeDatabaseId: undefined,
    themePreference: 'lavender-light',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('users').insertOne(newUser);

  // Automatically provision default workspace
  const defaultWorkspace = {
    id: workspaceId,
    userId,
    name: `${displayName}'s Workspace`,
    description: 'Default Virtual Database Lab workspace',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.collection('workspaces').insertOne(defaultWorkspace);

  // Also provision a default database CollegeDB with sample students collection
  const databaseId = `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const physicalNamespace = `dc_${workspaceId}_${databaseId}`;

  const defaultDb = {
    id: databaseId,
    workspaceId,
    userId,
    name: 'CollegeDB',
    physicalNamespace,
    description: 'Introductory relational-to-document sample database',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.collection('virtual_databases').insertOne(defaultDb);

  // Seed sample collection 'students' in the namespace
  const client = getPlatformDb().client;
  const userMongoDb = client.db(physicalNamespace);
  await userMongoDb.collection('students').insertMany([
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

  newUser.activeDatabaseId = databaseId;
  await db.collection('users').updateOne({ id: userId }, { $set: { activeDatabaseId: databaseId } });

  return newUser;
}

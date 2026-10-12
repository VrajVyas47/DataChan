import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getNamespaceDb } from '../../database/mongoClient';
import { ApiResponse, UserProfile, UserRole, UserStatus } from '@datachan/shared-types';
import { AuthenticationError, AuthorizationError, InvalidRequestError, ResourceNotFoundError } from '../../errors';
import { getFirebaseAuth } from '../../security/firebaseAdmin';
import { setSessionCookie, clearSessionCookie } from '../../security/session';
import { logSecurityEvent } from '../../security/audit';
import { config } from '../../config';
import { logger } from '../../logging/logger';

/**
 * Creates an authoritative application session from a Firebase ID token.
 * Validates token, provisions Data-Chan user if first login (as 'student'),
 * sets HttpOnly SameSite=Lax session cookie, and returns sanitized profile.
 */
export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idToken, displayName } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      throw new InvalidRequestError('Valid Firebase ID token is required');
    }

    const auth = getFirebaseAuth();

    // 1. Verify Firebase ID Token cryptographically
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken, true);
    } catch (err: any) {
      logger.warn(`Firebase ID token verification failed: ${err.message}`);
      throw new AuthenticationError('Invalid or expired Firebase ID token', { original: err.message });
    }

    const { uid: firebaseUid, email, name, picture, email_verified, auth_time } = decodedToken;
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail) {
      throw new AuthenticationError('Authenticated user must have an email address');
    }

    // Verify recent authentication (within 15 minutes) for sensitive session exchange
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (auth_time && nowSeconds - auth_time > 15 * 60) {
      throw new AuthenticationError('Authentication session is too old. Please re-authenticate.');
    }

    const db = getPlatformDb();

    // 2. Lookup existing user in MongoDB
    let user = await db.collection('users').findOne({ firebaseUid });

    // Handle legacy email migration (if user registered with same email before Firebase UID was linked)
    if (!user && cleanEmail) {
      const existingByEmail = await db.collection('users').findOne({ email: cleanEmail });
      if (existingByEmail) {
        // SECURITY CRITICAL: Linking requires verified ownership via Firebase email_verified
        if (!email_verified) {
          logger.warn(`Unverified Firebase login attempted to link legacy email ${cleanEmail}`);
          throw new AuthenticationError('Email verification required before linking existing laboratory account');
        }

        await db.collection('users').updateOne(
          { _id: existingByEmail._id },
          {
            $set: {
              firebaseUid,
              emailVerified: true,
              updatedAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            },
            $unset: {
              password: '',
              passwordHash: '',
              passwordSalt: '',
            },
          }
        );
        user = await db.collection('users').findOne({ firebaseUid });
      }
    }

    const now = new Date().toISOString();

    // 3. User Provisioning: First-time self-service registration
    let concurrentRecovery = false;
    if (!user) {
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const resolvedName = (displayName || name || cleanEmail.split('@')[0]).trim();
      const username = resolvedName.replace(/\s+/g, '_').toLowerCase();

      // SECURITY RULE: All public self-service accounts start as 'student'
      const assignedRole: UserRole = 'student';
      const assignedStatus: UserStatus = 'active';

      const newUserRecord = {
        id: userId,
        firebaseUid,
        email: cleanEmail,
        username,
        displayName: resolvedName,
        role: assignedRole,
        status: assignedStatus,
        emailVerified: email_verified || false,
        ...(picture ? { photoUrl: picture } : {}),
        xp: 0,
        level: 1,
        streakDays: 1,
        activeWorkspaceId: workspaceId,
        activeDatabaseId: null,
        themePreference: 'lavender-light',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      try {
        await db.collection('users').insertOne(newUserRecord);
      } catch (insertErr: any) {
        if (insertErr.code === 11000) {
          logger.warn(`Concurrent registration detected for ${firebaseUid}, recovering existing record`);
          user = await db.collection('users').findOne({ firebaseUid });
          concurrentRecovery = true;
        } else {
          throw insertErr;
        }
      }

      if (!concurrentRecovery) {
        // Provision default workspace
        const defaultWorkspace = {
          id: workspaceId,
          userId,
          name: `${resolvedName}'s Workspace`,
          description: 'Default Virtual Database Lab workspace',
          createdAt: now,
          updatedAt: now,
        };
        await db.collection('workspaces').insertOne(defaultWorkspace);

        // Provision default CollegeDB virtual database
        const databaseId = `db_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const physicalNamespace = `dc_${workspaceId}_${databaseId}`;
        const defaultDb = {
          id: databaseId,
          workspaceId,
          userId,
          name: 'CollegeDB',
          physicalDatabaseName: physicalNamespace,
          physicalNamespace,
          status: 'active' as const,
          description: 'Introductory relational-to-document sample database',
          createdAt: now,
          updatedAt: now,
        };
        await db.collection('virtual_databases').insertOne(defaultDb);

        // Seed starter collection 'students' in CollegeDB
        try {
          const userMongoDb = getNamespaceDb(physicalNamespace);
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
          ]);
        } catch (seedErr: any) {
          logger.warn(`Could not seed initial sample database: ${seedErr.message}`);
        }

        await db.collection('users').updateOne({ id: userId }, { $set: { activeDatabaseId: databaseId } });

        // Propagate role to Firebase custom claims
        try {
          await auth.setCustomUserClaims(firebaseUid, { role: assignedRole });
        } catch (err: any) {
          logger.warn(`Could not set Firebase custom claims for new user ${firebaseUid}:`, err.message);
        }

        user = await db.collection('users').findOne({ firebaseUid });
      }
    }

    if (!user) {
      throw new AuthenticationError('Failed to establish user account.');
    }

    // 4. Verify account status for existing user
    if (user.status && user.status !== 'active') {
      await logSecurityEvent({
        action: 'FORBIDDEN_ATTEMPT',
        userId: user.id,
        firebaseUid,
        details: { reason: `Attempted login on account with status ${user.status}` },
        req,
      });
      throw new AuthorizationError(`Account is ${user.status}. Access denied.`);
    }

    if (!concurrentRecovery) {
      // Update last login timestamp
      await db.collection('users').updateOne(
        { firebaseUid },
        {
          $set: {
            lastLoginAt: now,
            updatedAt: now,
            emailVerified: email_verified || user.emailVerified || false,
          },
        }
      );
    }

    // 5. Create Firebase Session Cookie
    const expiresInMs = config.session.expirationDays * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });

    // 6. Set Secure HttpOnly SameSite=Lax session cookie
    setSessionCookie(res, sessionCookie, expiresInMs);

    // 7. Record Security Audit Log
    await logSecurityEvent({
      action: 'LOGIN_SESSION_CREATED',
      userId: user!.id,
      firebaseUid,
      details: { role: user!.role, email: cleanEmail },
      req,
    });

    // 8. Return sanitized user data
    const sanitizedUser = {
      id: user!.id,
      firebaseUid: user!.firebaseUid,
      email: user!.email,
      username: user!.username,
      displayName: user!.displayName,
      role: user!.role,
      status: user!.status || 'active',
      activeWorkspaceId: user!.activeWorkspaceId,
      activeDatabaseId: user!.activeDatabaseId,
      themePreference: user!.themePreference || 'lavender-light',
    };

    res.status(200).json({
      success: true,
      data: { user: sanitizedUser },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns full profile and real-time statistics for the authenticated principal.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const user = await db.collection('users').findOne({ id: req.user!.userId });
    if (!user) {
      throw new ResourceNotFoundError('User', req.user!.userId);
    }

    const [activeDatabasesCount, queriesExecutedCount, lessonsCompletedCount, challengesSolvedCount] =
      await Promise.all([
        db.collection('virtual_databases').countDocuments({ userId: user.id }),
        db.collection('query_history').countDocuments({ userId: user.id }),
        db.collection('lesson_progress').countDocuments({ userId: user.id, completed: true }),
        db.collection('challenge_attempts').countDocuments({ userId: user.id, passed: true }),
      ]);

    const userProfile: UserProfile = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role || 'student',
      status: user.status || 'active',
      emailVerified: user.emailVerified || false,
      photoUrl: user.photoUrl,
      activeWorkspaceId: user.activeWorkspaceId,
      activeDatabaseId: user.activeDatabaseId,
      activeCollectionName: user.activeCollectionName,
      themePreference: user.themePreference || 'lavender-light',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      xp: user.xp || 0,
      level: Math.floor((user.xp || 0) / 100) + 1,
      streakDays: user.streakDays || 1,
      lessonsCompletedCount,
      challengesSolvedCount,
      queriesExecutedCount,
      activeDatabasesCount,
      skills: [
        {
          skillId: 'mongodb-basics',
          name: 'MongoDB Basics',
          level: Math.min(5, Math.floor(lessonsCompletedCount / 3) + 1),
          progressPercent: Math.min(100, lessonsCompletedCount * 20),
        },
        {
          skillId: 'crud-operations',
          name: 'CRUD Operations',
          level: queriesExecutedCount > 10 ? 2 : 1,
          progressPercent: Math.min(100, queriesExecutedCount * 5),
        },
        {
          skillId: 'filtering-querying',
          name: 'Filtering & Operators',
          level: challengesSolvedCount > 2 ? 2 : 1,
          progressPercent: Math.min(100, challengesSolvedCount * 25),
        },
        {
          skillId: 'aggregation-pipelines',
          name: 'Aggregation Pipelines',
          level: 1,
          progressPercent: Math.min(100, challengesSolvedCount * 15),
        },
        {
          skillId: 'data-modeling',
          name: 'Data Modeling',
          level: 1,
          progressPercent: 30,
        },
      ],
      achievements: [
        {
          id: 'first-db',
          title: 'First Database',
          description: 'Created your first isolated virtual database',
          icon: 'database',
          unlockedAt: user.createdAt,
        },
        {
          id: 'first-query',
          title: 'First Query',
          description: 'Executed an MQL query in the MongoDB playground',
          icon: 'terminal',
          unlockedAt: queriesExecutedCount > 0 ? user.updatedAt : undefined,
        },
        {
          id: 'challenge-conqueror',
          title: 'Challenge Conqueror',
          description: 'Solved your first laboratory challenge',
          icon: 'trophy',
          unlockedAt: challengesSolvedCount > 0 ? user.updatedAt : undefined,
        },
      ],
    };

    const response: ApiResponse<UserProfile> = {
      success: true,
      data: userProfile,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Updates non-privileged user preferences.
 * Does NOT allow changing roles.
 */
export async function syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const { displayName, themePreference, activeWorkspaceId, activeDatabaseId } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (displayName && typeof displayName === 'string') updates.displayName = displayName.trim();
    if (themePreference && typeof themePreference === 'string') updates.themePreference = themePreference;
    if (activeWorkspaceId && typeof activeWorkspaceId === 'string') updates.activeWorkspaceId = activeWorkspaceId;
    if (activeDatabaseId && typeof activeDatabaseId === 'string') updates.activeDatabaseId = activeDatabaseId;

    await db.collection('users').updateOne({ id: req.user!.userId }, { $set: updates });

    const updatedUser = await db.collection('users').findOne({ id: req.user!.userId });
    res.json({
      success: true,
      data: updatedUser,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Invalidates the user session and clears the HttpOnly cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.firebaseUid) {
      try {
        const auth = getFirebaseAuth();
        await auth.revokeRefreshTokens(req.user.firebaseUid);
      } catch (err: any) {
        logger.warn(`Could not revoke refresh tokens on logout for ${req.user.firebaseUid}: ${err.message}`);
      }

      await logSecurityEvent({
        action: 'LOGOUT',
        userId: req.user.userId,
        firebaseUid: req.user.firebaseUid,
        req,
      });
    }

    clearSessionCookie(res);

    res.json({
      success: true,
      data: { message: 'Session logged out successfully' },
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

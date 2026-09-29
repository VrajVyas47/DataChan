import { Request, Response, NextFunction } from 'express';
import { getPlatformDb } from '../../database/mongoClient';
import { ApiResponse, UserProfile } from '@datachan/shared-types';
import { ResourceNotFoundError } from '../../errors';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const user = await db.collection('users').findOne({ id: req.user!.userId });
    if (!user) {
      throw new ResourceNotFoundError('User', req.user!.userId);
    }

    // Query active counts
    const activeDatabasesCount = await db
      .collection('virtual_databases')
      .countDocuments({ userId: user.id });

    const queriesExecutedCount = await db
      .collection('query_history')
      .countDocuments({ userId: user.id });

    const lessonsCompletedCount = await db
      .collection('lesson_progress')
      .countDocuments({ userId: user.id, completed: true });

    const challengesSolvedCount = await db
      .collection('challenge_attempts')
      .countDocuments({ userId: user.id, passed: true });

    const userProfile: UserProfile = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      activeWorkspaceId: user.activeWorkspaceId,
      activeDatabaseId: user.activeDatabaseId,
      activeCollectionName: user.activeCollectionName,
      themePreference: user.themePreference || 'lavender-light',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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

export async function syncUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const { displayName, themePreference, activeWorkspaceId, activeDatabaseId } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (displayName) updates.displayName = displayName;
    if (themePreference) updates.themePreference = themePreference;
    if (activeWorkspaceId) updates.activeWorkspaceId = activeWorkspaceId;
    if (activeDatabaseId) updates.activeDatabaseId = activeDatabaseId;

    await db.collection('users').updateOne({ id: req.user!.userId }, { $set: updates });

    const updatedUser = await db.collection('users').findOne({ id: req.user!.userId });
    const response: ApiResponse = {
      success: true,
      data: updatedUser,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { ApiResponse, ChallengeEvaluationResult } from '@datachan/shared-types';
import { LAB_CHALLENGES } from './challengeSeed';
import { parseMqlQuery } from '../../security/queryParser';
import { ResourceNotFoundError, InvalidRequestError } from '../../errors';

export async function listChallenges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const attempts = await db
      .collection('challenge_attempts')
      .find({ userId: req.user!.userId })
      .toArray();

    const solvedSet = new Set<string>();
    for (const a of attempts) {
      if (a.passed) {
        solvedSet.add(a.challengeId);
      }
    }

    const challengesWithStatus = LAB_CHALLENGES.map((ch) => ({
      id: ch.id,
      title: ch.title,
      difficulty: ch.difficulty,
      category: ch.category,
      xpReward: ch.xpReward,
      estimatedMinutes: ch.estimatedMinutes,
      problemStatement: ch.problemStatement,
      contextDescription: ch.contextDescription,
      targetCollection: ch.targetCollection,
      starterQuery: ch.starterQuery,
      hints: ch.hints,
      datasetDescription: ch.datasetDescription,
      verificationType: ch.verificationType,
      isSolved: solvedSet.has(ch.id),
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: challengesWithStatus,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const ch = LAB_CHALLENGES.find((c) => c.id === id);

    if (!ch) {
      throw new ResourceNotFoundError('Challenge', id);
    }

    const db = getPlatformDb();
    const passedAttempt = await db
      .collection('challenge_attempts')
      .findOne({ userId: req.user!.userId, challengeId: id, passed: true });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        id: ch.id,
        title: ch.title,
        difficulty: ch.difficulty,
        category: ch.category,
        xpReward: ch.xpReward,
        estimatedMinutes: ch.estimatedMinutes,
        problemStatement: ch.problemStatement,
        contextDescription: ch.contextDescription,
        targetCollection: ch.targetCollection,
        starterQuery: ch.starterQuery,
        hints: ch.hints,
        datasetDescription: ch.datasetDescription,
        verificationType: ch.verificationType,
        isSolved: !!passedAttempt,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function submitChallengeAttempt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  try {
    const id = String(req.params.id || '');
    const { query, databaseId } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new InvalidRequestError('A valid MongoDB query string is required');
    }

    const challenge = LAB_CHALLENGES.find((c) => c.id === id);
    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', id);
    }

    const platformDb = getPlatformDb();
    const user = await platformDb.collection('users').findOne({ id: req.user!.userId });
    const targetDbId = databaseId || user?.activeDatabaseId;

    if (!targetDbId) {
      throw new InvalidRequestError('No active virtual database available to test challenge against');
    }

    const vdb = await platformDb.collection('virtual_databases').findOne({ id: targetDbId });
    if (!vdb) {
      throw new ResourceNotFoundError('Virtual Database', targetDbId);
    }

    // Parse query safely
    const parsed = parseMqlQuery(query, targetDbId, challenge.targetCollection);
    const normalized = parsed.normalized;

    // Execute query in user's database namespace
    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);
    const col = userDb.collection(challenge.targetCollection);

    let results: any[] = [];
    if (normalized.operation === 'find') {
      let cursor = col.find(normalized.filter || {}, { projection: normalized.projection });
      if (normalized.sort && Object.keys(normalized.sort).length > 0) {
        cursor = cursor.sort(normalized.sort);
      }
      if (normalized.limit) {
        cursor = cursor.limit(normalized.limit);
      }
      results = await cursor.toArray();
    } else if (normalized.operation === 'aggregate') {
      results = await col.aggregate(normalized.pipeline || []).toArray();
    } else {
      throw new InvalidRequestError(`Operation ${normalized.operation} not expected for this challenge.`);
    }

    // Deterministic evaluation
    const evaluation = challenge.evaluator(results);
    const executionMs = Date.now() - startTime;

    let xpEarned = 0;
    if (evaluation.passed) {
      // Check if user already solved this challenge previously
      const priorSolve = await platformDb
        .collection('challenge_attempts')
        .findOne({ userId: req.user!.userId, challengeId: id, passed: true });

      if (!priorSolve) {
        xpEarned = challenge.xpReward;
        await platformDb.collection('users').updateOne(
          { id: req.user!.userId },
          {
            $inc: { xp: xpEarned },
            $set: { updatedAt: new Date().toISOString() },
          }
        );
      }
    }

    // Save attempt record
    await platformDb.collection('challenge_attempts').insertOne({
      id: `cha_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: req.user!.userId,
      challengeId: id,
      query,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      executionMs,
      createdAt: new Date().toISOString(),
    });

    const resultPayload: ChallengeEvaluationResult = {
      passed: evaluation.passed,
      score: evaluation.passed ? 100 : 0,
      feedback: evaluation.feedback,
      actualDocumentsCount: results.length,
      xpEarned,
    };

    const response: ApiResponse<ChallengeEvaluationResult> = {
      success: true,
      data: resultPayload,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

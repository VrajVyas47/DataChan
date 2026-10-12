import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import { parseMqlQuery } from '../../security/queryParser';
import {
  InvalidRequestError,
  ResourceNotFoundError,
  AuthorizationError,
} from '../../errors';
import { config } from '../../config';
import { sanitizeDocumentIds } from '../playground/playgroundController';
import { logger } from '../../logging/logger';

const MURDER_MYSTERY_GAME_ID = 'case_001_midnight_murder';

// Initial Game Data (Mocking metadata for now)
const GAMES_CATALOG = [
  {
    id: MURDER_MYSTERY_GAME_ID,
    title: 'The Midnight Murder',
    slug: 'murder-mystery',
    description: 'Investigate a murder at the Blackwood Grand Hotel using MongoDB queries.',
    type: 'Database Investigation',
    difficulty: 'Beginner',
    status: 'published',
  },
];

const CHAPTERS = [
  {
    id: 'chapter_1',
    gameId: MURDER_MYSTERY_GAME_ID,
    order: 1,
    title: 'Who was in the hotel?',
    story: 'At 11:52 PM, Adrian Black is found dead in Room 204. The police arrived at 12:05 AM. We need to establish an initial list of people inside the hotel around the time of the murder.',
    objective: 'Find all people inside the hotel between 11:00 PM and midnight (23:00 to 24:00) using the `visits` collection.',
    challengeId: 'chal_001',
  },
  {
    id: 'chapter_2',
    gameId: MURDER_MYSTERY_GAME_ID,
    order: 2,
    title: 'Who could reach Room 204?',
    story: 'We know who was in the building, but Room 204 is on the second floor.',
    objective: 'Find people whose keycard accessed the second floor between 11:00 PM and midnight.',
    challengeId: 'chal_002',
  },
];

export async function listGames(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.json({ success: true, data: GAMES_CATALOG });
}

export async function getGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = String(req.params.id);
  const game = GAMES_CATALOG.find((g) => g.id === id);
  if (!game) {
    return next(new ResourceNotFoundError('Game', id));
  }
  res.json({ success: true, data: { ...game, chapters: CHAPTERS.filter(c => c.gameId === id) } });
}

export async function startOrResumeGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    if (id !== MURDER_MYSTERY_GAME_ID) {
      throw new ResourceNotFoundError('Game', id);
    }

    const userId = req.user!.userId;
    const db = getPlatformDb();

    // 1. Resolve or provision parent workspace for the user to satisfy schema requirements
    const user = await db.collection('users').findOne({ id: userId });
    let workspaceId = user?.activeWorkspaceId;
    if (!workspaceId) {
      const existingWs = await db.collection('workspaces').findOne({ userId });
      workspaceId = existingWs?.id;
    }
    if (!workspaceId) {
      workspaceId = `ws_${userId}`;
      await db.collection('workspaces').insertOne({
        id: workspaceId,
        userId,
        name: `${user?.displayName || 'Student'}'s Workspace`,
        description: 'Auto-provisioned workspace for investigations and lab work',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Provision or retrieve sandbox virtual database
    // Ensure total physicalNamespace (dc_<workspaceId>_<sandboxId>) is <= 63 characters (MongoDB driver limit)
    const cleanUserId = userId.replace(/^usr_/, '').substring(0, 12);
    const cleanGameId = id.replace(/^case_/, 'c').substring(0, 12);
    const sandboxId = `vdb_g_${cleanUserId}_${cleanGameId}`;
    let vdb = await db.collection('virtual_databases').findOne({ id: sandboxId });

    if (!vdb) {
      const physicalNamespace = `dc_${workspaceId.substring(0, 20)}_${sandboxId}`.substring(0, 63);

      const newVdb = {
        id: sandboxId,
        workspaceId,
        userId,
        name: 'The Midnight Murder Sandbox',
        description: 'Dedicated investigation database for Case #001',
        status: 'active',
        physicalDatabaseName: physicalNamespace,
        physicalNamespace,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('virtual_databases').insertOne(newVdb as any);
      vdb = newVdb as any;

      // Seed the dataset in the isolated physical namespace
      const client = getMongoClient();
      const userDb = client.db(physicalNamespace);

      // Decoy & Real Investigation Data (Canonical 5 suspects inside 23:00-24:00 murder window)
      const visits = [
        { person: 'Sarah Mitchell', time: '23:15', purpose: 'Conference Prep' },
        { person: 'Daniel Carter', time: '23:10', purpose: 'Meeting' },
        { person: 'Emily Ross', time: '23:30', purpose: 'Interview' },
        { person: 'Michael Reed', time: '23:05', purpose: 'Security Shift' },
        { person: 'Olivia Blake', time: '23:20', purpose: 'Guest' },
        { person: 'John Doe', time: '22:15', purpose: 'Dinner' }, // earlier (22:15)
        { person: 'Jane Smith', time: '00:15', purpose: 'Late Check-in' } // later (00:15)
      ];

      const access_logs = [
        { person: 'Daniel Carter', floor: 2, time: '23:27', room: 'Hallway' },
        { person: 'Michael Reed', floor: 2, time: '23:19', room: 'Security Closet' },
        { person: 'Olivia Blake', floor: 2, time: '23:21', room: '204' },
        { person: 'Olivia Blake', floor: 2, time: '23:48', room: '204' },
        { person: 'Olivia Blake', floor: 2, time: '23:51', room: 'Stairwell' },
        { person: 'Sarah Mitchell', floor: 1, time: '23:10', room: 'Conference Hall' },
      ];

      const security_logs = [
        { action: 'camera_disabled', camera: '2A', time: '23:19', user: 'Michael Reed' },
        { action: 'camera_online', camera: '2A', time: '23:31', user: 'System' },
      ];

      const messages = [
        { sender: 'Sarah Mitchell', recipient: 'Adrian Black', time: '22:42', content: "Please don't tell anyone." },
        { sender: 'Daniel Carter', recipient: 'Adrian Black', time: '22:57', content: "We need to talk." },
        { sender: 'Olivia Blake', recipient: 'Adrian Black', time: '23:13', content: "Meet me upstairs." },
        { sender: 'Adrian Black', recipient: 'Olivia Blake', time: '23:21', content: "Room 204. Come alone." },
      ];

      const evidence = [
        { location: 'Room 204', item: 'Broken glass' },
        { location: 'Room 204', item: 'Hotel keycard' },
        { location: 'Room 204', item: 'Torn note: "You weren\'t supposed to find out."' }
      ];

      const transactions = [
        { amount: 85000, recipient: 'Sarah Mitchell', date: '2026-09-15' },
        { amount: 1500, recipient: 'Hotel Supply Co', date: '2026-10-01' },
      ];

      await Promise.all([
        userDb.collection('visits').insertMany(visits),
        userDb.collection('access_logs').insertMany(access_logs),
        userDb.collection('security_logs').insertMany(security_logs),
        userDb.collection('messages').insertMany(messages),
        userDb.collection('evidence').insertMany(evidence),
        userDb.collection('transactions').insertMany(transactions),
      ]);
    } else {
      // Ensure existing sandbox has canonical visits alignment
      const client = getMongoClient();
      const userDb = client.db(vdb.physicalNamespace);
      await userDb.collection('visits').updateOne(
        { person: 'Daniel Carter', time: '22:45' },
        { $set: { time: '23:10' } }
      );
    }

    // 3. Resolve or initialize game progress
    let progress = await db.collection('game_progress').findOne({ userId, gameId: id });
    if (!progress) {
      const newProgress = {
        id: `gp_${userId}_${id}`,
        userId,
        gameId: id,
        currentChapter: 'chapter_1',
        completedChallenges: [],
        discoveredEvidence: [],
        discoveredClues: [],
        status: 'in_progress',
        sandboxId,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('game_progress').insertOne(newProgress as any);
      progress = newProgress as any;
    }

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
}

export async function getGameProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const userId = req.user!.userId;
    const db = getPlatformDb();

    const progress = await db.collection('game_progress').findOne({ userId, gameId: id });
    if (!progress) {
      throw new ResourceNotFoundError('Game Progress', id);
    }

    res.json({
      success: true,
      data: {
        ...progress,
        completedChallenges: progress.completedChallenges || [],
        discoveredEvidence: progress.discoveredEvidence || [],
        discoveredClues: progress.discoveredClues || [],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function runGameQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const { challengeId, query: rawQuery } = req.body;
    const userId = req.user!.userId;
    const db = getPlatformDb();

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      throw new InvalidRequestError('A valid MongoDB query string is required');
    }

    const progress = await db.collection('game_progress').findOne({ userId, gameId: id });
    if (!progress) {
      throw new InvalidRequestError('Game session not started. Please initialize the case sandbox first.');
    }

    const sandboxId = progress.sandboxId;
    const vdb = await db.collection('virtual_databases').findOne({ id: sandboxId });
    if (!vdb || vdb.userId !== userId) {
      throw new AuthorizationError('Sandbox not accessible or not owned by user.');
    }

    // Parse collection name from raw query (e.g. db.visits.find(...))
    const match = rawQuery.match(/db\.([a-zA-Z0-9_]+)\./);
    const collection = match ? match[1] : 'visits';

    const parsed = parseMqlQuery(rawQuery, sandboxId, collection);
    const queryToRun = parsed.normalized;

    if (!queryToRun || !queryToRun.operation) {
      throw new InvalidRequestError('No valid MongoDB operation parsed from query input');
    }

    // Only allow read operations for game queries
    if (!['find', 'findOne', 'countDocuments', 'aggregate'].includes(queryToRun.operation)) {
      throw new InvalidRequestError('Only read operations (find, findOne, countDocuments, aggregate) are permitted in this game sandbox.');
    }

    const collectionName = queryToRun.collection || collection;
    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);
    const col = userDb.collection(collectionName);

    const maxTime = config.sandbox.maxQueryExecutionMs;
    const maxResults = config.sandbox.maxResultDocuments; // 100

    let resultData: any = null;

    switch (queryToRun.operation) {
      case 'find': {
        const filter = queryToRun.filter || {};
        const projection = queryToRun.projection || {};
        const sort = queryToRun.sort || {};
        const limit = Math.min(queryToRun.limit || maxResults, maxResults);
        const skip = queryToRun.skip || 0;

        let cursor = col.find(filter, { projection }).maxTimeMS(maxTime);
        if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
        if (skip > 0) cursor = cursor.skip(skip);
        cursor = cursor.limit(limit);

        const docs = await cursor.toArray();
        resultData = sanitizeDocumentIds(docs);
        break;
      }

      case 'findOne': {
        const filter = queryToRun.filter || {};
        const projection = queryToRun.projection || {};
        const doc = await col.findOne(filter, { projection, maxTimeMS: maxTime });
        resultData = sanitizeDocumentIds(doc);
        break;
      }

      case 'countDocuments': {
        const filter = queryToRun.filter || {};
        const count = await col.countDocuments(filter, { maxTimeMS: maxTime });
        resultData = { count };
        break;
      }

      case 'aggregate': {
        const pipeline = queryToRun.pipeline || [];
        if (pipeline.length > 15) {
          throw new InvalidRequestError('Aggregation pipeline exceeds sandbox limit of 15 stages.');
        }
        const hasLimit = pipeline.some((stage: any) => stage.$limit !== undefined);
        const effectivePipeline = hasLimit ? pipeline : [...pipeline, { $limit: maxResults }];
        const aggCursor = col.aggregate(effectivePipeline, { maxTimeMS: maxTime });
        const aggDocs = await aggCursor.toArray();
        resultData = sanitizeDocumentIds(aggDocs);
        break;
      }
    }

    res.json({ success: true, data: resultData });
  } catch (err) {
    next(err);
  }
}

export async function validateGameChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const challengeId = String(req.params.challengeId);
    const { query: rawQuery, result } = req.body;
    const userId = req.user!.userId;
    const db = getPlatformDb();

    if (challengeId !== 'chal_001') {
      throw new InvalidRequestError('Only Chapter 1 (chal_001) is supported in this slice.');
    }

    const progress = await db.collection('game_progress').findOne({ userId, gameId: id });
    if (!progress) {
      throw new InvalidRequestError('Game session not started.');
    }

    if (!Array.isArray(result)) {
      throw new InvalidRequestError('Validation requires query results as an array.');
    }

    // Semantic validation for Chapter 1
    // Objective: Find all people inside the hotel between 11:00 PM and midnight (23:00 to 24:00) using visits collection.
    // Canonical 5 suspects in hotel during murder window:
    // Sarah Mitchell, Daniel Carter, Emily Ross, Michael Reed, Olivia Blake.
    const expectedSuspects = ['Sarah Mitchell', 'Daniel Carter', 'Emily Ross', 'Michael Reed', 'Olivia Blake'];
    const resultPeople = result.map((doc: any) => doc?.person).filter(Boolean);

    // Strict evaluation: must contain all 5 suspects, exactly 5 results, zero outsiders
    const hasAllFive = expectedSuspects.every((p) => resultPeople.includes(p));
    const noOutsiders = resultPeople.every((p) => expectedSuspects.includes(p));
    const isSolved = hasAllFive && noOutsiders && resultPeople.length === 5;

    if (isSolved) {
      const clueText = 'Everyone had an opportunity: 5 suspects were present inside the hotel during the murder window.';

      // 1. Derive stable, server-side reward key (never trust client-supplied input)
      // Uniquely identifies the reward for this user, game, and challenge
      const rewardKey = `game_reward:${userId}:${id}:${challengeId}`;
      let xpAwarded = 0;

      // 2. Single atomic conditional update to authoritative user document:
      // Condition: claimedRewardKeys does NOT already contain rewardKey
      // Actions: increment users.xp by 100 AND record rewardKey in claimedRewardKeys
      // Guarantee: Cannot be applied more than once, immune to concurrent races and retry after ambiguous writes
      const userUpdateResult = await db.collection('users').updateOne(
        {
          id: userId,
          claimedRewardKeys: { $ne: rewardKey },
        },
        {
          $inc: { xp: 100 },
          $addToSet: { claimedRewardKeys: rewardKey } as any,
          $set: { updatedAt: new Date().toISOString() },
        }
      );

      // Only award XP in response if this update was the first to transition the reward key
      if (userUpdateResult.modifiedCount > 0) {
        xpAwarded = 100;
      }

      // 3. Idempotently record challenge completion and unlocked clue in game_progress
      // $addToSet ensures idempotent repetition without duplicate entries or array pollution
      await db.collection('game_progress').updateOne(
        { _id: progress._id },
        {
          $addToSet: {
            completedChallenges: challengeId,
            discoveredClues: clueText,
          } as any,
          $set: {
            currentChapter: 'chapter_2',
            updatedAt: new Date().toISOString(),
          },
        }
      );

      res.json({
        success: true,
        data: {
          solved: true,
          clue: clueText,
          nextChapter: 'chapter_2',
          message: 'Correct! You have successfully identified all 5 suspects present during the murder window.',
          xpAwarded,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          solved: false,
          message: 'Query executed successfully, but the result does not match all 5 suspects in the hotel during the murder window (11:00 PM to midnight). Verify your filter on the visits collection to ensure all 5 people are captured.',
          xpAwarded: 0,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

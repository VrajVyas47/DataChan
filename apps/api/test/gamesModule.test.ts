import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as gamesController from '../src/modules/games/gamesController';
import * as mongoClientModule from '../src/database/mongoClient';

describe('Games Module - Case #001 Stabilization & Security Regression Tests', () => {
  let mockPlatformDb: any;
  let mockUserDb: any;
  let mockClient: any;
  let mockVirtualDbsCol: any;
  let mockWorkspacesCol: any;
  let mockGameProgressCol: any;
  let mockUsersCol: any;
  let mockVisitsCol: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorkspacesCol = {
      findOne: vi.fn().mockResolvedValue({
        id: 'ws_test_user_1',
        userId: 'usr_test_user_1',
        name: 'Workspace',
      }),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };

    mockVirtualDbsCol = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };

    mockGameProgressCol = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    mockUsersCol = {
      findOne: vi.fn().mockResolvedValue({
        id: 'usr_test_user_1',
        userId: 'usr_test_user_1',
        activeWorkspaceId: 'ws_test_user_1',
        displayName: 'Detective Test',
      }),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    mockVisitsCol = {
      find: vi.fn().mockReturnValue({
        maxTimeMS: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          { _id: 'doc1', person: 'Sarah Mitchell', time: '23:15' },
          { _id: 'doc2', person: 'Daniel Carter', time: '23:10' },
          { _id: 'doc3', person: 'Emily Ross', time: '23:30' },
          { _id: 'doc4', person: 'Michael Reed', time: '23:05' },
          { _id: 'doc5', person: 'Olivia Blake', time: '23:20' },
        ]),
      }),
      findOne: vi.fn().mockResolvedValue({ _id: 'doc1', person: 'Sarah Mitchell', time: '23:15' }),
      countDocuments: vi.fn().mockResolvedValue(5),
      aggregate: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'doc1', person: 'Sarah Mitchell', time: '23:15' },
        ]),
      }),
      insertMany: vi.fn().mockResolvedValue({ acknowledged: true }),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    mockPlatformDb = {
      databaseName: 'datachan_platform',
      collection: vi.fn((colName: string) => {
        if (colName === 'workspaces') return mockWorkspacesCol;
        if (colName === 'virtual_databases') return mockVirtualDbsCol;
        if (colName === 'game_progress') return mockGameProgressCol;
        if (colName === 'users') return mockUsersCol;
        return {
          findOne: vi.fn().mockResolvedValue(null),
          insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
          insertMany: vi.fn().mockResolvedValue({ acknowledged: true }),
          updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
      }),
    };

    mockUserDb = {
      collection: vi.fn(() => mockVisitsCol),
    };

    mockClient = {
      db: vi.fn((name: string) => {
        if (name === 'datachan_platform') return mockPlatformDb;
        return mockUserDb;
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockPlatformDb);
    vi.spyOn(mongoClientModule, 'getMongoClient').mockReturnValue(mockClient as any);
  });

  // ==========================================================================
  // 1. Sandbox Provisioning & Schema Validation Tests
  // ==========================================================================
  describe('1. Sandbox Provisioning and Document Validation Compliance', () => {
    it('provisions sandbox adhering strictly to virtual_databases JSON schema validator', async () => {
      const req = {
        params: { id: 'case_001_midnight_murder' },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.startOrResumeGame(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockVirtualDbsCol.insertOne).toHaveBeenCalledTimes(1);

      const insertedVdb = mockVirtualDbsCol.insertOne.mock.calls[0][0];

      // Validate required schema fields
      expect(insertedVdb).toHaveProperty('id');
      expect(insertedVdb).toHaveProperty('workspaceId', 'ws_test_user_1');
      expect(insertedVdb).toHaveProperty('userId', 'usr_test_user_1');
      expect(insertedVdb).toHaveProperty('name');
      expect(insertedVdb).toHaveProperty('status', 'active');
      expect(insertedVdb).toHaveProperty('physicalDatabaseName');
      expect(insertedVdb).toHaveProperty('physicalNamespace');
      expect(insertedVdb).toHaveProperty('createdAt');
      expect(insertedVdb).toHaveProperty('updatedAt');

      // Wire protocol limit: physical database name must be <= 63 bytes/chars
      expect(insertedVdb.physicalNamespace.length).toBeLessThanOrEqual(63);
      expect(insertedVdb.physicalDatabaseName.length).toBeLessThanOrEqual(63);

      expect(responseData.success).toBe(true);
      expect(responseData.data.gameId).toBe('case_001_midnight_murder');
      expect(responseData.data.sandboxId).toBe(insertedVdb.id);
    });

    it('resumes existing game progress without creating duplicate records', async () => {
      const existingProgress = {
        _id: 'gp_existing_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        sandboxId: 'vdb_g_test_user_1_c001_midnigh',
        currentChapter: 'chapter_1',
        unlockedClues: ['clue_001'],
        completedChallenges: ['chal_001'],
        status: 'in_progress',
        startedAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
      };

      const existingVdb = {
        id: 'vdb_g_test_user_1_c001_midnigh',
        workspaceId: 'ws_test_user_1',
        userId: 'usr_test_user_1',
        name: 'The Midnight Murder Sandbox',
        physicalNamespace: 'dc_ws_test_user_1_vdb_g_test_user_1_c001_midnigh',
      };

      mockVirtualDbsCol.findOne.mockResolvedValue(existingVdb);
      mockGameProgressCol.findOne.mockResolvedValue(existingProgress);

      const req = {
        params: { id: 'case_001_midnight_murder' },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.startOrResumeGame(req, res, next);

      expect(next).not.toHaveBeenCalled();
      // Should NOT re-insert vdb or game_progress
      expect(mockVirtualDbsCol.insertOne).not.toHaveBeenCalled();
      expect(mockGameProgressCol.insertOne).not.toHaveBeenCalled();

      expect(responseData.data.completedChallenges).toEqual(['chal_001']);
      expect(responseData.data.unlockedClues).toEqual(['clue_001']);
    });
  });

  // ==========================================================================
  // 2. Query Engine Security & Controlled Execution
  // ==========================================================================
  describe('2. Query Engine Security, Sandbox Isolation & Read-Only Enforcement', () => {
    it('executes safe read operations against the isolated sandbox', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        sandboxId: 'vdb_g_test_user_1_c001',
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      const ownedVdb = {
        id: 'vdb_g_test_user_1_c001',
        userId: 'usr_test_user_1',
        physicalNamespace: 'dc_ws_test_user_1_vdb_g_test_user_1_c001',
      };
      mockVirtualDbsCol.findOne.mockResolvedValue(ownedVdb);

      const req = {
        params: { id: 'case_001_midnight_murder' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:00", $lte: "24:00" } })',
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.runGameQuery(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith(ownedVdb.physicalNamespace);
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data).toHaveLength(5);
    });

    it('rejects cross-user sandbox access with AuthorizationError', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        sandboxId: 'vdb_g_other_user_c001',
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      const foreignVdb = {
        id: 'vdb_g_other_user_c001',
        userId: 'usr_other_student', // Belongs to different user
        physicalNamespace: 'dc_ws_other_vdb_g_other',
      };
      mockVirtualDbsCol.findOne.mockResolvedValue(foreignVdb);

      const req = {
        params: { id: 'case_001_midnight_murder' },
        body: {
          query: 'db.visits.find({})',
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      let caughtError: any = null;
      const next = vi.fn((err) => {
        caughtError = err;
      }) as NextFunction;

      await gamesController.runGameQuery(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(caughtError.statusCode).toBe(403);
      expect(caughtError.message).toContain('Sandbox not accessible or not owned by user');
    });

    it('blocks mutating operations such as insertOne, deleteMany, drop', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        sandboxId: 'vdb_g_test_user_1_c001',
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      const ownedVdb = {
        id: 'vdb_g_test_user_1_c001',
        userId: 'usr_test_user_1',
        physicalNamespace: 'dc_ws_test_user_1_vdb_g_test_user_1_c001',
      };
      mockVirtualDbsCol.findOne.mockResolvedValue(ownedVdb);

      const req = {
        params: { id: 'case_001_midnight_murder' },
        body: {
          query: 'db.visits.insertOne({ person: "Hacker", time: "23:00" })',
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      let caughtError: any = null;
      const next = vi.fn((err) => {
        caughtError = err;
      }) as NextFunction;

      await gamesController.runGameQuery(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(caughtError.statusCode).toBe(400);
      expect(caughtError.message).toContain('Only read operations');
    });
  });

  // ==========================================================================
  // 3. Challenge Validation & Gamification Deduplication
  // ==========================================================================
  describe('3. Chapter 1 Challenge Validation & Authoritative XP Awarding', () => {
    it('accepts correct query results identifying all 5 canonical suspects and unlocks clue', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [],
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);
      mockGameProgressCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })',
          result: [
            { person: 'Sarah Mitchell', time: '23:15' },
            { person: 'Daniel Carter', time: '23:10' },
            { person: 'Emily Ross', time: '23:30' },
            { person: 'Michael Reed', time: '23:05' },
            { person: 'Olivia Blake', time: '23:20' },
          ],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.solved).toBe(true);
      expect(responseData.data.nextChapter).toBe('chapter_2');
      expect(responseData.data.xpAwarded).toBe(100);
      expect(responseData.data.clue).toContain('5 suspects were present inside the hotel');
      expect(mockGameProgressCol.updateOne).toHaveBeenCalledTimes(1);
      expect(mockUsersCol.updateOne).toHaveBeenCalledWith(
        {
          id: 'usr_test_user_1',
          claimedRewardKeys: { $ne: 'game_reward:usr_test_user_1:case_001_midnight_murder:chal_001' },
        },
        {
          $inc: { xp: 100 },
          $addToSet: { claimedRewardKeys: 'game_reward:usr_test_user_1:case_001_midnight_murder:chal_001' },
          $set: expect.objectContaining({ updatedAt: expect.any(String) }),
        }
      );
    });

    it('rejects incomplete query results (only 4 suspects) and does not unlock clue', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [],
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:05", $lt: "24:00" } })',
          result: [
            { person: 'Sarah Mitchell', time: '23:15' },
            { person: 'Emily Ross', time: '23:30' },
            { person: 'Michael Reed', time: '23:05' },
            { person: 'Olivia Blake', time: '23:20' },
            // Missing Daniel Carter (incomplete)
          ],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.solved).toBe(false);
      expect(responseData.data.xpAwarded).toBe(0);
      expect(responseData.data.message).toContain('result does not match all 5 suspects');
      expect(mockUsersCol.updateOne).not.toHaveBeenCalled();
      expect(mockGameProgressCol.updateOne).not.toHaveBeenCalled();
    });

    it('rejects query results containing outsiders outside the murder window', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [],
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: "22:15" })',
          result: [{ person: 'John Doe', time: '22:15' }],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.solved).toBe(false);
      expect(responseData.data.xpAwarded).toBe(0);
      expect(responseData.data.message).toContain('result does not match all 5 suspects');
      expect(mockUsersCol.updateOne).not.toHaveBeenCalled();
      expect(mockGameProgressCol.updateOne).not.toHaveBeenCalled();
    });

    it('awards 0 XP on serial duplicate completion to prevent double-awarding', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: ['chal_001'],
        discoveredClues: ['Everyone had an opportunity: 5 suspects were present inside the hotel during the murder window.'],
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);
      // Atomic condition { claimedRewardKeys: { $ne: rewardKey } } returns modifiedCount: 0 when key was already claimed
      mockUsersCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
      mockGameProgressCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })',
          result: [
            { person: 'Sarah Mitchell', time: '23:15' },
            { person: 'Daniel Carter', time: '23:10' },
            { person: 'Emily Ross', time: '23:30' },
            { person: 'Michael Reed', time: '23:05' },
            { person: 'Olivia Blake', time: '23:20' },
          ],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.solved).toBe(true);
      expect(responseData.data.xpAwarded).toBe(0);
      expect(mockUsersCol.updateOne).toHaveBeenCalledWith(
        {
          id: 'usr_test_user_1',
          claimedRewardKeys: { $ne: 'game_reward:usr_test_user_1:case_001_midnight_murder:chal_001' },
        },
        expect.anything()
      );
      expect(mockGameProgressCol.updateOne).toHaveBeenCalledTimes(1);
    });

    it('ensures race-free idempotency under concurrent duplicate submissions (only 1 awards XP)', async () => {
      const activeProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [],
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(activeProgress);

      // Simulate MongoDB document lock serialization: 1st wins, 2nd gets modifiedCount: 0
      mockUsersCol.updateOne
        .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 })
        .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });
      mockGameProgressCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

      const createReq = () =>
        ({
          params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
          body: {
            query: 'db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })',
            result: [
              { person: 'Sarah Mitchell', time: '23:15' },
              { person: 'Daniel Carter', time: '23:10' },
              { person: 'Emily Ross', time: '23:30' },
              { person: 'Michael Reed', time: '23:05' },
              { person: 'Olivia Blake', time: '23:20' },
            ],
          },
          user: { userId: 'usr_test_user_1', role: 'student' },
        } as unknown as Request);

      let resp1: any = null;
      const res1 = { json: vi.fn((p) => { resp1 = p; return res1; }) } as unknown as Response;
      const next1 = vi.fn() as NextFunction;

      let resp2: any = null;
      const res2 = { json: vi.fn((p) => { resp2 = p; return res2; }) } as unknown as Response;
      const next2 = vi.fn() as NextFunction;

      await Promise.all([
        gamesController.validateGameChallenge(createReq(), res1, next1),
        gamesController.validateGameChallenge(createReq(), res2, next2),
      ]);

      expect(next1).not.toHaveBeenCalled();
      expect(next2).not.toHaveBeenCalled();
      expect(resp1.success).toBe(true);
      expect(resp2.success).toBe(true);

      const totalXpAwarded = resp1.data.xpAwarded + resp2.data.xpAwarded;
      expect(totalXpAwarded).toBe(100);
      expect([resp1.data.xpAwarded, resp2.data.xpAwarded]).toContain(100);
      expect([resp1.data.xpAwarded, resp2.data.xpAwarded]).toContain(0);
    });

    it('propagates error when users.updateOne fails without marking game_progress completed', async () => {
      const initialProgress = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [],
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(initialProgress);

      // Simulate failure on users collection atomic update
      mockUsersCol.updateOne.mockRejectedValueOnce(new Error('Transient database network error'));

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })',
          result: [
            { person: 'Sarah Mitchell', time: '23:15' },
            { person: 'Daniel Carter', time: '23:10' },
            { person: 'Emily Ross', time: '23:30' },
            { person: 'Michael Reed', time: '23:05' },
            { person: 'Olivia Blake', time: '23:20' },
          ],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      // game_progress must NOT be modified if user XP update failed
      expect(mockGameProgressCol.updateOne).not.toHaveBeenCalled();
    });

    it('prevents double-awarding on retry after an ambiguous write outcome where MongoDB committed the update', async () => {
      // Scenario: Previous attempt had ambiguous outcome where MongoDB committed the atomic update
      // (incremented xp and added claimedRewardKeys), but socket disconnected before client received ack.
      // On retry, user document already contains the reward key.
      const progressBeforeRetry = {
        _id: 'gp_123',
        gameId: 'case_001_midnight_murder',
        userId: 'usr_test_user_1',
        completedChallenges: [], // game_progress was not yet reached during previous ambiguous failure
        discoveredClues: [],
      };
      mockGameProgressCol.findOne.mockResolvedValue(progressBeforeRetry);

      // In MongoDB, the conditional filter { claimedRewardKeys: { $ne: rewardKey } } evaluates to false
      mockUsersCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
      mockGameProgressCol.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });

      const req = {
        params: { id: 'case_001_midnight_murder', challengeId: 'chal_001' },
        body: {
          query: 'db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })',
          result: [
            { person: 'Sarah Mitchell', time: '23:15' },
            { person: 'Daniel Carter', time: '23:10' },
            { person: 'Emily Ross', time: '23:30' },
            { person: 'Michael Reed', time: '23:05' },
            { person: 'Olivia Blake', time: '23:20' },
          ],
        },
        user: { userId: 'usr_test_user_1', role: 'student' },
      } as unknown as Request;

      let responseData: any = null;
      const res = {
        json: vi.fn((payload) => {
          responseData = payload;
          return res;
        }),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await gamesController.validateGameChallenge(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(responseData.success).toBe(true);
      expect(responseData.data.solved).toBe(true);
      // Critical assertion: 0 duplicate XP awarded on retry of ambiguous write
      expect(responseData.data.xpAwarded).toBe(0);
      expect(responseData.data.nextChapter).toBe('chapter_2');
      // But game_progress is safely completed and clue is persisted
      expect(mockGameProgressCol.updateOne).toHaveBeenCalledWith(
        { _id: 'gp_123' },
        {
          $addToSet: {
            completedChallenges: 'chal_001',
            discoveredClues: 'Everyone had an opportunity: 5 suspects were present inside the hotel during the murder window.',
          },
          $set: expect.objectContaining({
            currentChapter: 'chapter_2',
            updatedAt: expect.any(String),
          }),
        }
      );
    });
  });
});

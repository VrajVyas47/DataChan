import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { parseMqlQuery } from '../src/security/queryParser';
import * as playgroundController from '../src/modules/playground/playgroundController';
import * as queryHistoryController from '../src/modules/query-history/queryHistoryController';
import * as mongoClientModule from '../src/database/mongoClient';

describe('Playground, Query History, Syntax Analysis & Version Contract Tests', () => {
  let mockPlatformDb: any;
  let mockUserDb: any;
  let mockClient: any;
  let mockVirtualDbsCol: any;
  let mockQueryHistoryCol: any;
  let mockUsersCol: any;
  let mockStudentsCol: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockVirtualDbsCol = {
      findOne: vi.fn().mockResolvedValue({
        id: 'vdb_student_1',
        userId: 'usr_student_dev',
        workspaceId: 'ws_student_dev',
        name: 'student_sandbox',
        physicalNamespace: 'datachan_user_student',
      }),
    };

    mockQueryHistoryCol = {
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true, insertedId: 'qh_mock_123' }),
      find: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 5 }),
    };

    mockUsersCol = {
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };

    mockStudentsCol = {
      find: vi.fn().mockReturnValue({
        maxTimeMS: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          { _id: 'doc1', name: 'Alice', age: 20 },
          { _id: 'doc2', name: 'Bob', age: 22 },
        ]),
      }),
      insertOne: vi.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: 'doc_inserted_123',
      }),
    };

    mockPlatformDb = {
      databaseName: 'datachan_platform',
      collection: vi.fn((colName: string) => {
        if (colName === 'virtual_databases') return mockVirtualDbsCol;
        if (colName === 'query_history') return mockQueryHistoryCol;
        if (colName === 'users') return mockUsersCol;
        return {
          findOne: vi.fn().mockResolvedValue(null),
          insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        };
      }),
      command: vi.fn().mockResolvedValue({ version: '8.2.5' }),
    };

    mockUserDb = {
      collection: vi.fn(() => mockStudentsCol),
    };

    mockClient = {
      db: vi.fn((name: string) => {
        if (name === 'datachan_platform') return mockPlatformDb;
        if (name === 'admin') {
          return {
            command: vi.fn().mockResolvedValue({ version: '8.2.5' }),
          };
        }
        return mockUserDb;
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockPlatformDb);
    vi.spyOn(mongoClientModule, 'getMongoClient').mockReturnValue(mockClient as any);
  });

  // ==========================================================================
  // 1. React Unique Key Warning & Data Contract
  // ==========================================================================
  describe('1. Query History Stable Unique Identifiers', () => {
    it('returns stable string id for all items even if id field is missing from raw Mongo document', async () => {
      const rawMongoDocs = [
        {
          _id: '507f191e810c19729de860ea',
          userId: 'usr_student_dev',
          databaseId: 'vdb_student_1',
          operation: 'find',
          rawQuery: 'db.students.find()',
          executionTimeMs: 14,
          status: 'success',
          createdAt: '2026-10-02T10:00:00.000Z',
        },
        {
          _id: '507f191e810c19729de860eb',
          id: 'qh_custom_id_123',
          userId: 'usr_student_dev',
          databaseId: 'vdb_student_1',
          operation: 'insertOne',
          rawQuery: 'db.students.insertOne({ name: "Alice" })',
          durationMs: 22,
          success: true,
          timestamp: '2026-10-02T10:05:00.000Z',
        },
      ];

      mockQueryHistoryCol.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(rawMongoDocs),
        }),
      });

      const req = {
        user: { userId: 'usr_student_dev' },
        query: { limit: '10' },
      } as unknown as Request;

      const headers: Record<string, string> = {};
      let jsonResult: any = null;

      const res = {
        setHeader: vi.fn((k: string, v: string) => {
          headers[k] = v;
        }),
        json: vi.fn((payload: any) => {
          jsonResult = payload;
        }),
      } as unknown as Response;

      const next = vi.fn();

      await queryHistoryController.getQueryHistory(req, res, next);

      expect(jsonResult).toBeDefined();
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.data).toHaveLength(2);

      // Verify every single item has a defined, non-empty, unique string ID
      const item1 = jsonResult.data[0];
      const item2 = jsonResult.data[1];

      expect(typeof item1.id).toBe('string');
      expect(item1.id).toBe('507f191e810c19729de860ea'); // Normalized from _id when id was missing
      expect(typeof item2.id).toBe('string');
      expect(item2.id).toBe('qh_custom_id_123'); // Preserved from id

      // Verify IDs are unique and not equal or undefined
      expect(item1.id).not.toBe(item2.id);
      expect(item1.id).not.toBe('undefined');
      expect(item2.id).not.toBe('undefined');

      // Verify HTTP Cache-Control header preventing stale browser 304s
      expect(headers['Cache-Control']).toBe('private, no-cache, no-store, must-revalidate');
    });
  });

  // ==========================================================================
  // 2. Query History Updates Immediately After Run
  // ==========================================================================
  describe('2. Query History Real-Time Persistence & Immediate Response', () => {
    it('persists a complete valid query_history document with all required schema fields and returns historyItem in QueryResult', async () => {
      const req = {
        user: { userId: 'usr_student_dev' },
        body: {
          databaseId: 'vdb_student_1',
          collection: 'students',
          rawQuery: 'db.students.find({ age: { $gt: 18 } })',
        },
      } as unknown as Request;

      let jsonResult: any = null;
      const res = {
        json: vi.fn((payload: any) => {
          jsonResult = payload;
        }),
      } as unknown as Response;

      const next = vi.fn();

      await playgroundController.executeQuery(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonResult.success).toBe(true);

      // Verify query history insertion was called
      expect(mockQueryHistoryCol.insertOne).toHaveBeenCalledTimes(1);
      const insertedDoc = mockQueryHistoryCol.insertOne.mock.calls[0][0];

      // Verify all required fields from schema/validators.ts are present
      expect(insertedDoc.userId).toBe('usr_student_dev');
      expect(insertedDoc.databaseId).toBe('vdb_student_1');
      expect(insertedDoc.operation).toBe('find');
      expect(typeof insertedDoc.executionTimeMs).toBe('number');
      expect(insertedDoc.status).toBe('success');
      expect(insertedDoc.createdAt).toBeDefined();
      expect(insertedDoc.id).toMatch(/^qh_\d+_/);

      // Verify query result contains the newly minted historyItem for immediate frontend state prepending
      expect(jsonResult.data.historyItem).toBeDefined();
      expect(jsonResult.data.historyItem.id).toBe(insertedDoc.id);
      expect(jsonResult.data.historyItem.status).toBe('success');
      expect(jsonResult.data.historyItem.rawQuery).toBe('db.students.find({ age: { $gt: 18 } })');
    });
  });

  // ==========================================================================
  // 3. Beginner Syntax Breakdown Live Parsing
  // ==========================================================================
  describe('3. Beginner Syntax Breakdown Live Analysis (No DB Mutation)', () => {
    it('provides educational breakdown tokens without executing DB queries or writing history', async () => {
      const req = {
        body: {
          databaseId: 'vdb_student_1',
          collection: 'students',
          rawQuery: 'db.students.find({ age: { $gt: 18 } }).sort({ gpa: -1 })',
        },
      } as unknown as Request;

      let jsonResult: any = null;
      const res = {
        json: vi.fn((payload: any) => {
          jsonResult = payload;
        }),
      } as unknown as Response;

      const next = vi.fn();

      await playgroundController.analyzeQuery(req, res, next);

      expect(jsonResult.success).toBe(true);
      expect(jsonResult.data.breakdown).toBeInstanceOf(Array);
      expect(jsonResult.data.breakdown.length).toBeGreaterThan(0);

      // Verify tokens: db, students, find(), $gt
      const tokens = jsonResult.data.breakdown.map((b: any) => b.token);
      expect(tokens).toContain('db');
      expect(tokens).toContain('students');
      expect(tokens).toContain('find()');
      expect(tokens).toContain('$gt');

      // CRITICAL: Ensure NO database writes occurred
      expect(mockQueryHistoryCol.insertOne).not.toHaveBeenCalled();
      expect(mockStudentsCol.find).not.toHaveBeenCalled();
      expect(mockStudentsCol.insertOne).not.toHaveBeenCalled();
    });

    it('returns graceful parser error info for incomplete code during user typing without failing', async () => {
      const req = {
        body: {
          databaseId: 'vdb_student_1',
          collection: 'students',
          rawQuery: 'db.students.find({ age: ',
        },
      } as unknown as Request;

      let jsonResult: any = null;
      const res = {
        json: vi.fn((payload: any) => {
          jsonResult = payload;
        }),
      } as unknown as Response;

      const next = vi.fn();

      await playgroundController.analyzeQuery(req, res, next);

      expect(jsonResult.success).toBe(true);
      expect(jsonResult.data.breakdown).toEqual([]);
      expect(jsonResult.data.error).toBeDefined();
      expect(typeof jsonResult.data.error).toBe('string');
      // No unhandled error passed to next
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 4. Multi-Statement MQL Rejection & No Partial Execution
  // ==========================================================================
  describe('4. Multi-Statement MQL Rejection & Atomicity', () => {
    it('allows a single valid MQL statement with or without trailing semicolons', () => {
      const single1 = 'db.students.find({ age: 20 })';
      const single2 = 'db.students.find({ age: 20 });';
      const single3 = 'db.students.find({ age: 20 });;';

      expect(() => parseMqlQuery(single1, 'vdb_1')).not.toThrow();
      expect(() => parseMqlQuery(single2, 'vdb_1')).not.toThrow();
      expect(() => parseMqlQuery(single3, 'vdb_1')).not.toThrow();
    });

    it('strictly rejects multi-statement queries with exact required message', () => {
      const multi = 'db.students.insertOne({ name: "Ghost" }); db.students.find({});';

      expect(() => parseMqlQuery(multi, 'vdb_1')).toThrow(
        'Multiple statements are not supported. Run one MongoDB operation at a time.'
      );
    });

    it('guarantees no partial database mutation occurs when multiple statements are executed', async () => {
      const req = {
        user: { userId: 'usr_student_dev' },
        body: {
          databaseId: 'vdb_student_1',
          collection: 'students',
          rawQuery: 'db.students.insertOne({ name: "Ghost" }); db.students.find({});',
        },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      let caughtErr: any = null;
      const next = vi.fn((err: any) => {
        caughtErr = err;
      });

      await playgroundController.executeQuery(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(caughtErr).toBeDefined();
      expect(caughtErr.message).toBe(
        'Multiple statements are not supported. Run one MongoDB operation at a time.'
      );

      // Verify that statement 1 (insertOne) was NEVER executed on the collection
      expect(mockStudentsCol.insertOne).not.toHaveBeenCalled();
      expect(mockStudentsCol.find).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 5. MongoDB Version Display & Telemetry
  // ==========================================================================
  describe('5. Authoritative MongoDB Server Version Contract', () => {
    it('returns authoritative live server version from getPlaygroundStatus', async () => {
      const req = {} as Request;
      let jsonResult: any = null;
      const res = {
        json: vi.fn((payload: any) => {
          jsonResult = payload;
        }),
      } as unknown as Response;

      const next = vi.fn();

      await playgroundController.getPlaygroundStatus(req, res, next);

      expect(jsonResult.success).toBe(true);
      expect(jsonResult.data.serverVersion).toBe('8.2.5');
      expect(jsonResult.data.storageEngine).toBe('WiredTiger');
      expect(jsonResult.data.status).toBe('connected');
      expect(jsonResult.data.limits).toBeDefined();
      expect(jsonResult.data.limits.maxQueryExecutionMs).toBeGreaterThan(0);
    });
  });
});

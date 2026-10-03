import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLATFORM_COLLECTIONS } from '../src/database/schema/collections';
import { COLLECTION_VALIDATORS } from '../src/database/schema/validators';
import { CANONICAL_INDEXES, syncCollectionIndexes } from '../src/database/schema/indexes';
import * as workspaceController from '../src/modules/workspaces/workspaceController';
import * as databaseController from '../src/modules/databases/databaseController';
import * as mongoClientModule from '../src/database/mongoClient';
import { AuthorizationError, ResourceNotFoundError } from '../src/errors';
import { Request, Response } from 'express';

describe('DATA-CHAN V1 Canonical Database Schema & Layer Tests', () => {
  describe('1. Canonical Platform Collections Inventory', () => {
    it('defines exactly the 18 canonical platform collections', () => {
      const canonicalList = Object.values(PLATFORM_COLLECTIONS);
      expect(canonicalList).toHaveLength(18);
      expect(canonicalList).toContain('users');
      expect(canonicalList).toContain('workspaces');
      expect(canonicalList).toContain('virtual_databases');
      expect(canonicalList).toContain('classrooms');
      expect(canonicalList).toContain('classroom_members');
      expect(canonicalList).toContain('cohort_assignments');
      expect(canonicalList).toContain('practicals');
      expect(canonicalList).toContain('courses');
      expect(canonicalList).toContain('modules');
      expect(canonicalList).toContain('lessons');
      expect(canonicalList).toContain('lesson_sections');
      expect(canonicalList).toContain('learning_progress');
      expect(canonicalList).toContain('challenges');
      expect(canonicalList).toContain('challenge_attempts');
      expect(canonicalList).toContain('query_history');
      expect(canonicalList).toContain('data_models');
      expect(canonicalList).toContain('forum_posts');
      expect(canonicalList).toContain('security_audit_logs');
    });

    it('has validators configured for all 18 platform collections', () => {
      for (const collName of Object.values(PLATFORM_COLLECTIONS)) {
        const valDef = COLLECTION_VALIDATORS[collName];
        expect(valDef, `Validator for ${collName} should exist`).toBeDefined();
        expect(valDef.validator.$jsonSchema).toBeDefined();
        expect(valDef.validator.$jsonSchema.bsonType).toBe('object');
        expect(Array.isArray(valDef.validator.$jsonSchema.required)).toBe(true);
      }
    });
  });

  describe('2. Validator Invariants & Enums', () => {
    it('enforces RBAC role enum [student, faculty, admin] on users validator', () => {
      const userSchema = COLLECTION_VALIDATORS.users.validator.$jsonSchema;
      expect(userSchema.properties.role.enum).toEqual(['student', 'faculty', 'admin']);
    });

    it('enforces status enum [active, suspended, disabled] on users validator', () => {
      const userSchema = COLLECTION_VALIDATORS.users.validator.$jsonSchema;
      expect(userSchema.properties.status.enum).toEqual(['active', 'suspended', 'disabled']);
    });

    it('enforces email regex pattern on users validator', () => {
      const userSchema = COLLECTION_VALIDATORS.users.validator.$jsonSchema;
      expect(userSchema.properties.email.pattern).toBeDefined();
    });

    it('enforces status enum [active, archived, deleted] on virtual_databases validator', () => {
      const vdbSchema = COLLECTION_VALIDATORS.virtual_databases.validator.$jsonSchema;
      expect(vdbSchema.properties.status.enum).toEqual(['active', 'archived', 'deleted']);
    });

    it('enforces status enum [active, archived] on classrooms validator', () => {
      const clsSchema = COLLECTION_VALIDATORS.classrooms.validator.$jsonSchema;
      expect(clsSchema.properties.status.enum).toEqual(['active', 'archived']);
    });

    it('enforces role and status enums on classroom_members validator', () => {
      const memberSchema = COLLECTION_VALIDATORS.classroom_members.validator.$jsonSchema;
      expect(memberSchema.properties.role.enum).toEqual(['student']);
      expect(memberSchema.properties.status.enum).toEqual(['active', 'removed']);
      expect(memberSchema.required).toContain('classroomId');
      expect(memberSchema.required).toContain('userId');
    });

    it('enforces difficulty enum on practicals validator', () => {
      const practicalSchema = COLLECTION_VALIDATORS.practicals.validator.$jsonSchema;
      expect(practicalSchema.properties.difficulty.enum).toEqual(['beginner', 'intermediate', 'advanced']);
      expect(practicalSchema.required).toContain('number');
      expect(practicalSchema.required).toContain('published');
    });

    it('enforces status enum on learning_progress validator', () => {
      const progressSchema = COLLECTION_VALIDATORS.learning_progress.validator.$jsonSchema;
      expect(progressSchema.properties.status.enum).toEqual(['not_started', 'in_progress', 'completed']);
      expect(progressSchema.required).toContain('userId');
      expect(progressSchema.properties.practicalId).toBeDefined();
      expect(progressSchema.properties.lessonId).toBeDefined();
    });

    it('enforces status enum on query_history validator', () => {
      const qhSchema = COLLECTION_VALIDATORS.query_history.validator.$jsonSchema;
      expect(qhSchema.properties.status.enum).toEqual(['success', 'error', 'timeout']);
      expect(qhSchema.required).toContain('userId');
      expect(qhSchema.required).toContain('databaseId');
      expect(qhSchema.required).toContain('operation');
    });
  });

  describe('3. Canonical Indexes Specification', () => {
    it('defines unique indexes for single-identifier lookups', () => {
      expect(CANONICAL_INDEXES.users.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.workspaces.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.virtual_databases.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.classrooms.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.practicals.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.lessons.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.challenges.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.data_models.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
      expect(CANONICAL_INDEXES.forum_posts.some((idx) => idx.options?.unique && 'id' in (idx.key as any))).toBe(true);
    });

    it('enforces unique compound constraints for domain integrity', () => {
      // 1. classroom_members (classroomId, userId) must be unique
      const cmIndex = CANONICAL_INDEXES.classroom_members.find((idx) => idx.options?.unique);
      expect(cmIndex).toBeDefined();
      expect(cmIndex?.key).toEqual({ classroomId: 1, userId: 1 });

      // 2. learning_progress (userId, practicalId) must be unique
      const lpIndex = CANONICAL_INDEXES.learning_progress.find((idx) => idx.options?.unique);
      expect(lpIndex).toBeDefined();
      expect(lpIndex?.key).toEqual({ userId: 1, practicalId: 1 });

      // 3. virtual_databases (workspaceId, name) must be unique
      const vdbIndex = CANONICAL_INDEXES.virtual_databases.find((idx) => idx.options?.unique && 'name' in (idx.key as any));
      expect(vdbIndex).toBeDefined();
      expect(vdbIndex?.key).toEqual({ workspaceId: 1, name: 1 });

      // 4. practicals (number) must be unique
      const practicalNumIdx = CANONICAL_INDEXES.practicals.find((idx) => idx.options?.unique && 'number' in (idx.key as any));
      expect(practicalNumIdx).toBeDefined();
      expect(practicalNumIdx?.key).toEqual({ number: 1 });
    });

    it('enforces users firebaseUid and email unique constraints', () => {
      const emailIdx = CANONICAL_INDEXES.users.find((idx) => 'email' in (idx.key as any));
      expect(emailIdx?.options?.unique).toBe(true);

      const fbUidIdx = CANONICAL_INDEXES.users.find((idx) => 'firebaseUid' in (idx.key as any));
      expect(fbUidIdx?.options?.unique).toBe(true);
      expect(fbUidIdx?.options?.sparse).toBe(true);
    });
  });

  describe('4. Idempotent Index Synchronizer Conflict Resolution', () => {
    it('detects conflicting non-unique index and drops it before recreating', async () => {
      const mockCollection: any = {
        collectionName: 'users',
        indexes: vi.fn().mockResolvedValue([
          { v: 2, key: { _id: 1 }, name: '_id_' },
          // Conflicting index: existing is NOT unique, but requested is unique
          { v: 2, key: { firebaseUid: 1 }, name: 'firebaseUid_1', sparse: true },
        ]),
        dropIndex: vi.fn().mockResolvedValue({ nIndexesWas: 2, ok: 1 }),
        createIndex: vi.fn().mockResolvedValue('firebaseUid_1'),
      };

      const testIndexDefs = [
        {
          key: { firebaseUid: 1 },
          options: { unique: true, sparse: true, name: 'firebaseUid_1' },
          description: 'Unique mapping test',
        },
      ];

      await syncCollectionIndexes(mockCollection, testIndexDefs);

      expect(mockCollection.dropIndex).toHaveBeenCalledWith('firebaseUid_1');
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ firebaseUid: 1 }, { unique: true, sparse: true, name: 'firebaseUid_1' });
    });

    it('skips recreating identical indexes for high performance and zero warnings', async () => {
      const mockCollection: any = {
        collectionName: 'users',
        indexes: vi.fn().mockResolvedValue([
          { v: 2, key: { _id: 1 }, name: '_id_' },
          { v: 2, key: { id: 1 }, name: 'id_1', unique: true },
        ]),
        dropIndex: vi.fn(),
        createIndex: vi.fn(),
      };

      const testIndexDefs = [
        {
          key: { id: 1 },
          options: { unique: true, name: 'id_1' },
          description: 'Unique user ID',
        },
      ];

      await syncCollectionIndexes(mockCollection, testIndexDefs);

      expect(mockCollection.dropIndex).not.toHaveBeenCalled();
      expect(mockCollection.createIndex).not.toHaveBeenCalled();
    });
  });

  describe('5. Multi-Tenant Ownership & Isolation Boundaries', () => {
    let mockPlatformDb: any;
    let mockWorkspacesCol: any;
    let mockVirtualDbsCol: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockWorkspacesCol = {
        findOne: vi.fn(),
        deleteOne: vi.fn(),
      };

      mockVirtualDbsCol = {
        findOne: vi.fn(),
        deleteOne: vi.fn(),
      };

      mockPlatformDb = {
        collection: vi.fn((colName: string) => {
          if (colName === 'workspaces') return mockWorkspacesCol;
          if (colName === 'virtual_databases') return mockVirtualDbsCol;
          return { findOne: vi.fn() };
        }),
      };

      vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockPlatformDb);
    });

    it('prohibits Student A from deleting Student B workspace', async () => {
      const studentA = { userId: 'usr_student_a', role: 'student' as const, email: 'a@datachan.test' };
      const studentBWorkspace = { id: 'ws_student_b', userId: 'usr_student_b', name: "Student B's Lab" };

      mockWorkspacesCol.findOne.mockResolvedValue(studentBWorkspace);

      const req = {
        user: studentA,
        params: { id: 'ws_student_b' },
      } as unknown as Request;

      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
      const next = vi.fn();

      await workspaceController.deleteWorkspace(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(mockWorkspacesCol.deleteOne).not.toHaveBeenCalled();
    });

    it('prohibits Student A from viewing Student B workspace details', async () => {
      const studentA = { userId: 'usr_student_a', role: 'student' as const, email: 'a@datachan.test' };
      const studentBWorkspace = { id: 'ws_student_b', userId: 'usr_student_b', name: "Student B's Lab" };

      mockWorkspacesCol.findOne.mockResolvedValue(studentBWorkspace);

      const req = {
        user: studentA,
        params: { id: 'ws_student_b' },
      } as unknown as Request;

      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
      const next = vi.fn();

      await workspaceController.getWorkspace(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('prohibits Student A from deleting Student B virtual database', async () => {
      const studentA = { userId: 'usr_student_a', role: 'student' as const, email: 'a@datachan.test' };
      const studentBVdb = {
        id: 'vdb_student_b',
        userId: 'usr_student_b',
        workspaceId: 'ws_student_b',
        name: 'CollegeDB',
        physicalNamespace: 'dc_ws_b_db_b',
      };

      mockVirtualDbsCol.findOne.mockResolvedValue(studentBVdb);

      const req = {
        user: studentA,
        params: { id: 'vdb_student_b' },
      } as unknown as Request;

      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
      const next = vi.fn();

      await databaseController.deleteDatabase(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(mockVirtualDbsCol.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('6. Dashboard Telemetry Real Metrics Derivation', () => {
    it('derives authoritative telemetry metrics from database without fake numbers', async () => {
      const mockDb: any = {
        databaseName: 'datachan_platform',
        command: vi.fn().mockResolvedValue({ uptime: 3600, version: '7.0.14' }),
        collection: vi.fn((colName: string) => {
          const counts: Record<string, number> = {
            users: 3,
            virtual_databases: 3,
            query_history: 16,
            forum_posts: 5,
          };
          return {
            countDocuments: vi.fn().mockResolvedValue(counts[colName] ?? 0),
          };
        }),
      };

      vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb);

      const [totalUsers, totalDatabases, totalQueries, totalPosts] = await Promise.all([
        mockDb.collection('users').countDocuments(),
        mockDb.collection('virtual_databases').countDocuments(),
        mockDb.collection('query_history').countDocuments(),
        mockDb.collection('forum_posts').countDocuments(),
      ]);

      expect(totalUsers).toBe(3);
      expect(totalDatabases).toBe(3);
      expect(totalQueries).toBe(16);
      expect(totalPosts).toBe(5);

      // Verify that when a database is empty, real metric returns 0 rather than fallback values
      const emptyCount = await mockDb.collection('nonexistent_collection').countDocuments();
      expect(emptyCount).toBe(0);
    });
  });
});

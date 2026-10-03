import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as coursesController from '../src/modules/learning/coursesController';
import * as modulesController from '../src/modules/learning/modulesController';
import * as sectionsController from '../src/modules/learning/sectionsController';
import * as learningController from '../src/modules/learning/learningController';
import * as mongoClientModule from '../src/database/mongoClient';
import { PLATFORM_COLLECTIONS } from '../src/database/schema/collections';
import { ResourceNotFoundError, InvalidRequestError, AuthorizationError } from '../src/errors';
import { requireRole } from '../src/middleware/auth';

describe('Curriculum Architecture: Course -> Module -> Lesson -> Section -> Content Blocks', () => {
  let mockDb: any;
  let coursesStore: any[];
  let modulesStore: any[];
  let lessonsStore: any[];
  let sectionsStore: any[];
  let progressStore: any[];
  let usersStore: any[];

  function matchFilter(item: any, filter: Record<string, any>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    if ('$or' in filter && Array.isArray(filter.$or)) {
      return filter.$or.some((subFilter: any) => matchFilter(item, subFilter));
    }
    return Object.entries(filter).every(([key, val]) => {
      if (val && typeof val === 'object' && '$in' in val) {
        return val.$in.includes(item[key]);
      }
      return item[key] === val;
    });
  }

  function createMockCollection(store: any[]) {
    return {
      find: vi.fn((filter: Record<string, any> = {}) => {
        let results = store.filter((item) => matchFilter(item, filter));
        return {
          sort: vi.fn(() => ({
            limit: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue(results),
            })),
            toArray: vi.fn().mockResolvedValue(results),
          })),
          toArray: vi.fn().mockResolvedValue(results),
        };
      }),
      findOne: vi.fn(async (filter: Record<string, any>) => {
        return store.find((item) => matchFilter(item, filter)) || null;
      }),
      insertOne: vi.fn(async (doc: any) => {
        store.push({ ...doc });
        return { acknowledged: true, insertedId: doc.id };
      }),
      updateOne: vi.fn(async (filter: Record<string, any>, update: any, options?: any) => {
        const item = store.find((i) =>
          Object.entries(filter).every(([k, v]) => i[k] === v)
        );
        if (item) {
          if (update.$set) Object.assign(item, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              item[k] = (item[k] || 0) + (v as number);
            }
          }
          return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
        } else if (options?.upsert) {
          const newDoc = { ...filter };
          if (update.$set) Object.assign(newDoc, update.$set);
          store.push(newDoc);
          return { acknowledged: true, upsertedCount: 1 };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      }),
      deleteOne: vi.fn(async (filter: Record<string, any>) => {
        const idx = store.findIndex((i) =>
          Object.entries(filter).every(([k, v]) => i[k] === v)
        );
        if (idx !== -1) {
          store.splice(idx, 1);
          return { acknowledged: true, deletedCount: 1 };
        }
        return { acknowledged: true, deletedCount: 0 };
      }),
      deleteMany: vi.fn(async (filter: Record<string, any>) => {
        let deleted = 0;
        for (let i = store.length - 1; i >= 0; i--) {
          if (matchFilter(store[i], filter)) {
            store.splice(i, 1);
            deleted++;
          }
        }
        return { acknowledged: true, deletedCount: deleted };
      }),
      countDocuments: vi.fn(async (filter: Record<string, any> = {}) => {
        return store.filter((item) =>
          Object.entries(filter).every(([k, v]) => item[k] === v)
        ).length;
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    coursesStore = [
      { id: 'crs_pub', title: 'Published Course', description: 'Core DB', status: 'published', order: 1 },
      { id: 'crs_draft', title: 'Draft Course', description: 'WIP', status: 'draft', order: 2 },
    ];

    modulesStore = [
      { id: 'mod_pub_1', courseId: 'crs_pub', title: 'Module 1', description: 'Foundations', status: 'published', order: 1 },
      { id: 'mod_draft_1', courseId: 'crs_pub', title: 'Module Draft', description: 'WIP Mod', status: 'draft', order: 2 },
    ];

    lessonsStore = [
      { id: 'les_pub_1', moduleId: 'mod_pub_1', courseId: 'crs_pub', title: 'Lesson 1', description: 'Docs Intro', status: 'published', order: 1, xpReward: 50 },
      { id: 'les_draft_1', moduleId: 'mod_pub_1', courseId: 'crs_pub', title: 'Lesson Draft', description: 'WIP Lesson', status: 'draft', order: 2, xpReward: 50 },
    ];

    sectionsStore = [
      {
        id: 'sec_pub_1',
        lessonId: 'les_pub_1',
        title: 'Section 1',
        order: 1,
        status: 'published',
        contentBlocks: [
          { type: 'text', order: 1, content: 'Welcome to MongoDB' },
          { type: 'code', order: 2, content: 'db.students.find()', language: 'javascript' },
          { type: 'output', order: 3, content: '[{"_id": "1", "name": "Alice"}]' },
          { type: 'note', order: 4, content: 'Important note on BSON types' },
          { type: 'example', order: 5, content: 'Real-world eCommerce schema example' },
          { type: 'playground', order: 6, content: 'Try query here', playgroundQuery: 'db.students.countDocuments()' },
        ],
      },
      {
        id: 'sec_pub_2',
        lessonId: 'les_pub_1',
        title: 'Section 2',
        order: 2,
        status: 'published',
        contentBlocks: [{ type: 'text', order: 1, content: 'More content' }],
      },
      {
        id: 'sec_draft_1',
        lessonId: 'les_pub_1',
        title: 'Draft Section',
        order: 3,
        status: 'draft',
        contentBlocks: [{ type: 'text', order: 1, content: 'Draft content' }],
      },
    ];

    progressStore = [];
    usersStore = [{ id: 'usr_student', xp: 100, role: 'student' }];

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === PLATFORM_COLLECTIONS.COURSES) return createMockCollection(coursesStore);
        if (name === PLATFORM_COLLECTIONS.MODULES) return createMockCollection(modulesStore);
        if (name === PLATFORM_COLLECTIONS.LESSONS) return createMockCollection(lessonsStore);
        if (name === PLATFORM_COLLECTIONS.LESSON_SECTIONS) return createMockCollection(sectionsStore);
        if (name === PLATFORM_COLLECTIONS.LEARNING_PROGRESS) return createMockCollection(progressStore);
        if (name === 'lesson_progress') return createMockCollection(progressStore);
        if (name === 'users') return createMockCollection(usersStore);
        return createMockCollection([]);
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb);
  });

  // =========================================================================
  // 1. RBAC & Faculty Authorization Invariants
  // =========================================================================
  describe('1. RBAC & Faculty Authorization Invariants', () => {
    it('allows faculty or admin to proceed through requireRole', async () => {
      const middleware = requireRole('faculty', 'admin');
      const req = { user: { role: 'faculty', userId: 'usr_fac' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects student with 403 AuthorizationError on protected content operations', async () => {
      const middleware = requireRole('faculty', 'admin');
      const req = {
        user: { role: 'student', userId: 'usr_stu' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });

  // =========================================================================
  // 2. Course CRUD & Student Draft Isolation
  // =========================================================================
  describe('2. Courses Controller', () => {
    it('returns only published courses for student user', async () => {
      const req = { user: { role: 'student', userId: 'usr_stu' }, query: {} } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await coursesController.listCourses(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = (res.json as any).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.every((c: any) => c.status === 'published')).toBe(true);
      expect(response.data.some((c: any) => c.id === 'crs_draft')).toBe(false);
    });

    it('returns 404 ResourceNotFoundError when student requests draft course by ID', async () => {
      const req = { user: { role: 'student', userId: 'usr_stu' }, params: { id: 'crs_draft' } } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await coursesController.getCourse(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ResourceNotFoundError));
    });

    it('allows faculty to create a new draft course', async () => {
      const req = {
        user: { role: 'faculty', userId: 'usr_fac' },
        body: { title: 'Advanced Aggregation Mastery', description: 'Deep pipelines', status: 'draft' },
      } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await coursesController.createCourse(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const created = (res.json as any).mock.calls[0][0].data;
      expect(created.title).toBe('Advanced Aggregation Mastery');
      expect(created.status).toBe('draft');
      expect(coursesStore.some((c) => c.title === 'Advanced Aggregation Mastery')).toBe(true);
    });

    it('cascades deletion of course to its modules, lessons, and sections', async () => {
      const req = {
        user: { role: 'admin', userId: 'usr_adm' },
        params: { id: 'crs_pub' },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await coursesController.deleteCourse(req, res, next);

      expect(coursesStore.some((c) => c.id === 'crs_pub')).toBe(false);
      expect(modulesStore.some((m) => m.courseId === 'crs_pub')).toBe(false);
      expect(lessonsStore.some((l) => l.courseId === 'crs_pub')).toBe(false);
      expect(sectionsStore.some((s) => s.lessonId === 'les_pub_1')).toBe(false);
    });
  });

  // =========================================================================
  // 3. Modules Controller & Reordering
  // =========================================================================
  describe('3. Modules Controller', () => {
    it('returns only published modules for student', async () => {
      const req = { user: { role: 'student', userId: 'usr_stu' }, query: { courseId: 'crs_pub' } } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await modulesController.listModules(req, res, next);

      const response = (res.json as any).mock.calls[0][0];
      expect(response.data.every((m: any) => m.status === 'published')).toBe(true);
      expect(response.data.some((m: any) => m.id === 'mod_draft_1')).toBe(false);
    });

    it('reorders modules correctly', async () => {
      const req = {
        user: { role: 'faculty', userId: 'usr_fac' },
        body: {
          items: [
            { id: 'mod_pub_1', order: 2 },
            { id: 'mod_draft_1', order: 1 },
          ],
        },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await modulesController.reorderModules(req, res, next);

      expect((res.json as any).mock.calls[0][0].success).toBe(true);
      expect(modulesStore.find((m) => m.id === 'mod_pub_1').order).toBe(2);
      expect(modulesStore.find((m) => m.id === 'mod_draft_1').order).toBe(1);
    });
  });

  // =========================================================================
  // 4. Sections Controller & Content Block Validation
  // =========================================================================
  describe('4. Sections Controller & Content Block Validation', () => {
    it('accepts valid content block types: text, code, output, note, image, example, playground', async () => {
      const validBlocks = [
        { type: 'text', order: 1, content: 'Intro text' },
        { type: 'code', order: 2, content: 'db.runCommand({ ping: 1 })', language: 'javascript' },
        { type: 'output', order: 3, content: '{ "ok": 1 }' },
        { type: 'note', order: 4, content: 'Cluster ping check' },
        { type: 'image', order: 5, content: 'https://img.data-chan.edu/diag.png', caption: 'Architecture' },
        { type: 'example', order: 6, content: 'Example schema structure' },
        { type: 'playground', order: 7, content: 'Execute query', playgroundQuery: 'db.ping()' },
      ];

      const req = {
        user: { role: 'faculty', userId: 'usr_fac' },
        body: {
          lessonId: 'les_pub_1',
          title: 'Comprehensive Section',
          status: 'published',
          contentBlocks: validBlocks,
        },
      } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await sectionsController.createSection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const created = (res.json as any).mock.calls[0][0].data;
      expect(created.contentBlocks).toHaveLength(7);
      expect(created.contentBlocks[0].type).toBe('text');
      expect(created.contentBlocks[6].type).toBe('playground');
    });

    it('rejects unsupported content block type with InvalidRequestError', async () => {
      const invalidBlocks = [
        { type: 'video_embed', order: 1, content: 'http://video.test' }, // invalid type!
      ];

      const req = {
        user: { role: 'faculty', userId: 'usr_fac' },
        body: {
          lessonId: 'les_pub_1',
          title: 'Invalid Block Section',
          contentBlocks: invalidBlocks,
        },
      } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await sectionsController.createSection(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(InvalidRequestError));
    });
  });

  // =========================================================================
  // 5. Section Completion & Learning Progress
  // =========================================================================
  describe('5. Section Completion & Learning Progress Tracking', () => {
    it('tracks completed sections, computes progressPercent, and marks lesson completed when all sections finished', async () => {
      // Complete Section 1
      const req1 = {
        user: { role: 'student', userId: 'usr_student' },
        params: { id: 'sec_pub_1' },
      } as unknown as Request;
      const res1 = { json: vi.fn() } as unknown as Response;
      const next1 = vi.fn();

      await sectionsController.completeSection(req1, res1, next1);

      const result1 = (res1.json as any).mock.calls[0][0].data;
      expect(result1.completedSectionIds).toContain('sec_pub_1');
      expect(result1.progressPercent).toBe(50); // 1 of 2 published sections completed = 50%
      expect(result1.lessonCompleted).toBe(false);

      // Complete Section 2
      const req2 = {
        user: { role: 'student', userId: 'usr_student' },
        params: { id: 'sec_pub_2' },
      } as unknown as Request;
      const res2 = { json: vi.fn() } as unknown as Response;
      const next2 = vi.fn();

      await sectionsController.completeSection(req2, res2, next2);

      const result2 = (res2.json as any).mock.calls[0][0].data;
      expect(result2.completedSectionIds).toContain('sec_pub_1');
      expect(result2.completedSectionIds).toContain('sec_pub_2');
      expect(result2.progressPercent).toBe(100);
      expect(result2.lessonCompleted).toBe(true);
      expect(result2.xpAwarded).toBe(50);

      // Verify user XP increased by 50
      const student = usersStore.find((u) => u.id === 'usr_student');
      expect(student.xp).toBe(150);
    });
  });

  // =========================================================================
  // 6. Lessons Controller & Challenge / Practical Associations
  // =========================================================================
  describe('6. Lessons Controller', () => {
    it('returns linked challengeIds on lesson retrieval', async () => {
      const req = {
        user: { role: 'student', userId: 'usr_student' },
        params: { id: 'les_pub_1' },
      } as unknown as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await learningController.getLesson(req, res, next);

      const lesson = (res.json as any).mock.calls[0][0].data;
      expect(lesson.id).toBe('les_pub_1');
      expect(Array.isArray(lesson.challengeIds)).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as classroomController from '../src/modules/classrooms/classroomController';
import * as mongoClientModule from '../src/database/mongoClient';
import { PLATFORM_COLLECTIONS } from '../src/database/schema/collections';
import { ResourceNotFoundError, InvalidRequestError, AuthorizationError, AppError } from '../src/errors';

describe('Cohort Assignments & Student Delivery System', () => {
  let mockDb: any;
  let classroomsStore: any[];
  let classroomMembersStore: any[];
  let cohortAssignmentsStore: any[];
  let lessonsStore: any[];
  let challengesStore: any[];

  const facultyA = {
    userId: 'usr_faculty_a',
    firebaseUid: 'fb_faculty_a',
    email: 'faculty.a@datachan.test',
    username: 'prof_a',
    role: 'faculty' as const,
    status: 'active' as const,
  };

  const facultyB = {
    userId: 'usr_faculty_b',
    firebaseUid: 'fb_faculty_b',
    email: 'faculty.b@datachan.test',
    username: 'prof_b',
    role: 'faculty' as const,
    status: 'active' as const,
  };

  const enrolledStudent = {
    userId: 'usr_student_enrolled',
    firebaseUid: 'fb_student_enrolled',
    email: 'student.enrolled@datachan.test',
    username: 'student_enrolled',
    role: 'student' as const,
    status: 'active' as const,
  };

  const outsiderStudent = {
    userId: 'usr_student_outsider',
    firebaseUid: 'fb_student_outsider',
    email: 'student.outsider@datachan.test',
    username: 'student_outsider',
    role: 'student' as const,
    status: 'active' as const,
  };

  function matchFilter(item: any, filter: Record<string, any>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    if ('$or' in filter && Array.isArray(filter.$or)) {
      return filter.$or.some((subFilter: any) => matchFilter(item, subFilter));
    }
    return Object.entries(filter).every(([key, val]) => {
      if (val && typeof val === 'object') {
        if ('$in' in val && Array.isArray(val.$in)) {
          return val.$in.includes(item[key]);
        }
      }
      return item[key] === val;
    });
  }

  function createMockCollection(store: any[]) {
    return {
      find: vi.fn((filter: Record<string, any> = {}) => {
        const results = store.filter((item) => matchFilter(item, filter));
        return {
          sort: vi.fn(() => ({
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
      updateOne: vi.fn(async (filter: Record<string, any>, update: any) => {
        const item = store.find((i) => matchFilter(i, filter));
        if (item) {
          if (update.$set) Object.assign(item, update.$set);
          return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    classroomsStore = [
      {
        id: 'cls_201',
        code: 'CS-201',
        name: 'Database Engineering 201',
        description: 'Advanced Relational and Document Modeling',
        facultyId: facultyA.userId,
        facultyName: 'Prof. Marcus Vance',
        enrolledStudentIds: [enrolledStudent.userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cls_301',
        code: 'CS-301',
        name: 'Distributed Systems 301',
        description: 'Sharding & Replication Lab',
        facultyId: facultyB.userId,
        facultyName: 'Prof. Sarah Lin',
        enrolledStudentIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    classroomMembersStore = [
      {
        id: 'mem_1',
        classroomId: 'cls_201',
        userId: enrolledStudent.userId,
        role: 'student',
        status: 'active',
        enrolledAt: new Date().toISOString(),
      },
    ];

    cohortAssignmentsStore = [];

    lessonsStore = [
      {
        id: 'lesson-1-mongodb-basics',
        title: 'MongoDB Basics',
        description: 'Core concepts of BSON and collections',
        category: 'Foundations',
        xpReward: 50,
        difficulty: 'beginner',
        order: 1,
        status: 'published',
      },
      {
        id: 'lesson-2-query-operators',
        title: 'Query & Projection Operators',
        description: 'Comparison and logical query operators',
        category: 'Querying',
        xpReward: 75,
        difficulty: 'intermediate',
        order: 2,
        status: 'published',
      },
    ];

    challengesStore = [
      {
        id: 'ch-filter-active-users',
        title: 'Filter Active Users',
        description: 'Write a query to filter active accounts',
        category: 'Filtering',
        xpReward: 100,
        difficulty: 'Easy',
        status: 'published',
      },
    ];

    mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === PLATFORM_COLLECTIONS.CLASSROOMS) return createMockCollection(classroomsStore);
        if (colName === PLATFORM_COLLECTIONS.CLASSROOM_MEMBERS) return createMockCollection(classroomMembersStore);
        if (colName === PLATFORM_COLLECTIONS.COHORT_ASSIGNMENTS) return createMockCollection(cohortAssignmentsStore);
        if (colName === PLATFORM_COLLECTIONS.LESSONS) return createMockCollection(lessonsStore);
        if (colName === PLATFORM_COLLECTIONS.CHALLENGES) return createMockCollection(challengesStore);
        return createMockCollection([]);
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb as any);
  });

  describe('1. Create Assignment (POST /classrooms/:id/assignments)', () => {
    it('allows cohort faculty owner to assign a lesson and returns 201 with enriched metadata', async () => {
      const req = {
        user: facultyA,
        params: { id: 'cls_201' },
        body: { targetType: 'lesson', targetId: 'lesson-1-mongodb-basics' },
      } as unknown as Request;
      const jsonMock = vi.fn();
      const statusMock = vi.fn(() => ({ json: jsonMock }));
      const res = { status: statusMock, json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(cohortAssignmentsStore.length).toBe(1);
      expect(cohortAssignmentsStore[0].classroomId).toBe('cls_201');
      expect(cohortAssignmentsStore[0].targetId).toBe('lesson-1-mongodb-basics');
      expect(cohortAssignmentsStore[0].targetType).toBe('lesson');
      expect(cohortAssignmentsStore[0].status).toBe('active');
      expect(cohortAssignmentsStore[0].assignedBy).toBe(facultyA.userId);

      // Verify enriched response payload
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            classroomId: 'cls_201',
            targetTitle: 'MongoDB Basics',
            cohortCode: 'CS-201',
            targetCategory: 'Foundations',
            status: 'active',
          }),
        })
      );
    });

    it('rejects duplicate active assignment for the same cohort + target with 409 Conflict', async () => {
      cohortAssignmentsStore.push({
        id: 'asg_existing_1',
        classroomId: 'cls_201',
        targetType: 'lesson',
        targetId: 'lesson-1-mongodb-basics',
        assignedBy: facultyA.userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = {
        user: facultyA,
        params: { id: 'cls_201' },
        body: { targetType: 'lesson', targetId: 'lesson-1-mongodb-basics' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('already actively assigned');
    });

    it('rejects assignment to a cohort owned by a different faculty with 403 AuthorizationError', async () => {
      const req = {
        user: facultyB, // Does not own cls_201
        params: { id: 'cls_201' },
        body: { targetType: 'lesson', targetId: 'lesson-1-mongodb-basics' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('rejects student attempting to create assignment with 403 AuthorizationError', async () => {
      const req = {
        user: enrolledStudent,
        params: { id: 'cls_201' },
        body: { targetType: 'lesson', targetId: 'lesson-1-mongodb-basics' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('rejects nonexistent curriculum target with 404 ResourceNotFoundError', async () => {
      const req = {
        user: facultyA,
        params: { id: 'cls_201' },
        body: { targetType: 'lesson', targetId: 'nonexistent-lesson-999' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ResourceNotFoundError));
    });

    it('rejects invalid targetType with 400 InvalidRequestError', async () => {
      const req = {
        user: facultyA,
        params: { id: 'cls_201' },
        body: { targetType: 'course', targetId: 'course-1' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(InvalidRequestError));
    });
  });

  describe('2. List Cohort Assignments (GET /classrooms/:id/assignments)', () => {
    beforeEach(() => {
      cohortAssignmentsStore.push({
        id: 'asg_1',
        classroomId: 'cls_201',
        targetType: 'lesson',
        targetId: 'lesson-1-mongodb-basics',
        assignedBy: facultyA.userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      cohortAssignmentsStore.push({
        id: 'asg_archived',
        classroomId: 'cls_201',
        targetType: 'lesson',
        targetId: 'lesson-2-query-operators',
        assignedBy: facultyA.userId,
        status: 'archived',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('allows cohort faculty instructor to list active assignments and excludes archived', async () => {
      const req = {
        user: facultyA,
        params: { id: 'cls_201' },
      } as unknown as Request;
      const jsonMock = vi.fn();
      const res = { json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.getCohortAssignments(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'asg_1',
              targetId: 'lesson-1-mongodb-basics',
              targetTitle: 'MongoDB Basics',
              status: 'active',
            }),
          ]),
        })
      );
      // Ensure archived assignments are not returned in active list
      const data = jsonMock.mock.calls[0][0].data;
      expect(data.length).toBe(1);
      expect(data[0].id).toBe('asg_1');
    });

    it('allows enrolled student member to retrieve cohort assignments', async () => {
      const req = {
        user: enrolledStudent,
        params: { id: 'cls_201' },
      } as unknown as Request;
      const jsonMock = vi.fn();
      const res = { json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.getCohortAssignments(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'asg_1',
              targetTitle: 'MongoDB Basics',
              cohortCode: 'CS-201',
            }),
          ]),
        })
      );
    });

    it('rejects student not enrolled in cohort with 403 AuthorizationError', async () => {
      const req = {
        user: outsiderStudent,
        params: { id: 'cls_201' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.getCohortAssignments(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('rejects another faculty member not teaching this cohort with 403 AuthorizationError', async () => {
      const req = {
        user: facultyB,
        params: { id: 'cls_201' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.getCohortAssignments(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });

  describe('3. Delete / Archive Assignment (DELETE /classrooms/:id/assignments/:assignmentId)', () => {
    beforeEach(() => {
      cohortAssignmentsStore.push({
        id: 'asg_active_to_unassign',
        classroomId: 'cls_201',
        targetType: 'lesson',
        targetId: 'lesson-1-mongodb-basics',
        assignedBy: facultyA.userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('allows faculty owner to archive assignment and changes status to archived', async () => {
      const req = {
        user: facultyA,
        params: { id: 'cls_201', assignmentId: 'asg_active_to_unassign' },
      } as unknown as Request;
      const jsonMock = vi.fn();
      const res = { json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.deleteCohortAssignment(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { unassigned: true, id: 'asg_active_to_unassign' },
        error: null,
      });

      const updated = cohortAssignmentsStore.find((a) => a.id === 'asg_active_to_unassign');
      expect(updated.status).toBe('archived');
    });

    it('rejects student attempting to unassign with 403 AuthorizationError', async () => {
      const req = {
        user: enrolledStudent,
        params: { id: 'cls_201', assignmentId: 'asg_active_to_unassign' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.deleteCohortAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });

  describe('4. Student My Assignments (GET /classrooms/my/assignments)', () => {
    beforeEach(() => {
      cohortAssignmentsStore.push({
        id: 'asg_for_my_cohort',
        classroomId: 'cls_201',
        targetType: 'lesson',
        targetId: 'lesson-1-mongodb-basics',
        assignedBy: facultyA.userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('returns all active assignments across enrolled cohorts for an authenticated student', async () => {
      const req = {
        user: enrolledStudent,
      } as unknown as Request;
      const jsonMock = vi.fn();
      const res = { json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.getMyCohortAssignments(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 'asg_for_my_cohort',
              targetId: 'lesson-1-mongodb-basics',
              targetTitle: 'MongoDB Basics',
              cohortCode: 'CS-201',
              cohortName: 'Database Engineering 201',
              status: 'active',
            }),
          ]),
        })
      );
    });

    it('returns empty list for a student with no active cohort assignments', async () => {
      const req = {
        user: outsiderStudent,
      } as unknown as Request;
      const jsonMock = vi.fn();
      const res = { json: jsonMock } as unknown as Response;
      const next = vi.fn();

      await classroomController.getMyCohortAssignments(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        error: null,
      });
    });
  });
});

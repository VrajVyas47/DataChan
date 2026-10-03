import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { requireRole } from '../src/middleware/auth';
import { AuthorizationError } from '../src/errors';
import * as classroomController from '../src/modules/classrooms/classroomController';
import * as adminController from '../src/modules/admin/adminController';
import * as mongoClientModule from '../src/database/mongoClient';

vi.mock('../src/security/audit', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Development Roles Matrix Access Tests', () => {
  const student = {
    userId: 'usr_student_dev',
    firebaseUid: 'fb_student_dev',
    email: 'student@datachan.test',
    username: 'student',
    role: 'student' as const,
    status: 'active' as const,
  };

  const faculty = {
    userId: 'usr_faculty_dev',
    firebaseUid: 'fb_faculty_dev',
    email: 'faculty@datachan.test',
    username: 'faculty',
    role: 'faculty' as const,
    status: 'active' as const,
  };

  const admin = {
    userId: 'usr_admin_dev',
    firebaseUid: 'fb_admin_dev',
    email: 'admin@datachan.test',
    username: 'admin',
    role: 'admin' as const,
    status: 'active' as const,
  };

  let mockDb: any;
  let mockUsersCol: any;
  let mockClassroomsCol: any;
  let mockVirtualDbsCol: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUsersCol = {
      findOne: vi.fn(),
      find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      countDocuments: vi.fn().mockResolvedValue(10),
    };

    mockClassroomsCol = {
      findOne: vi.fn(),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
      find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    };

    mockVirtualDbsCol = {
      countDocuments: vi.fn().mockResolvedValue(3),
    };

    mockDb = {
      databaseName: 'datachan_platform',
      command: vi.fn().mockResolvedValue({ ok: 1, uptime: 100, version: 'MongoDB 8.2' }),
      collection: vi.fn((colName: string) => {
        if (colName === 'users') return mockUsersCol;
        if (colName === 'classrooms') return mockClassroomsCol;
        if (colName === 'virtual_databases') return mockVirtualDbsCol;
        return {
          findOne: vi.fn(),
          find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
          countDocuments: vi.fn().mockResolvedValue(0),
        };
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb as any);
    vi.spyOn(mongoClientModule, 'getMongoClient').mockReturnValue({
      db: vi.fn(() => mockDb),
    } as any);
  });

  // 1. Student Access Tests
  describe('Student Access Permissions', () => {
    it('allows student to access student endpoints (requireRole("student", "faculty", "admin"))', async () => {
      const req = { user: student, originalUrl: '/api/v1/auth/me' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('student', 'faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('rejects student with 403 on faculty-only classroom creation (/classrooms)', async () => {
      const req = { user: student, originalUrl: '/api/v1/classrooms' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student with 403 on admin-only telemetry (/admin/stats)', async () => {
      const req = { user: student, originalUrl: '/api/v1/admin/stats' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student with 403 on admin-only user directory (/admin/users)', async () => {
      const req = { user: student, originalUrl: '/api/v1/admin/users' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });
  });

  // 2. Faculty Access Tests
  describe('Faculty Access Permissions', () => {
    it('allows faculty to create cohort sections (requireRole("faculty", "admin"))', async () => {
      const req = { user: faculty, originalUrl: '/api/v1/classrooms' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows faculty to execute createClassroom controller', async () => {
      const req = {
        user: faculty,
        body: { name: 'CS-201 Advanced MongoDB', description: 'Faculty cohort' },
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      await classroomController.createClassroom(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ name: 'CS-201 Advanced MongoDB' }),
        })
      );
    });

    it('rejects faculty with 403 on admin telemetry (/admin/stats)', async () => {
      const req = { user: faculty, originalUrl: '/api/v1/admin/stats' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Unauthorized access');
    });

    it('rejects faculty with 403 on admin user directory (/admin/users)', async () => {
      const req = { user: faculty, originalUrl: '/api/v1/admin/users' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects faculty with 403 on admin maintenance purge (/admin/maintenance/clean-orphans)', async () => {
      const req = { user: faculty, originalUrl: '/api/v1/admin/maintenance/clean-orphans' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });
  });

  // 3. Admin Access Tests
  describe('Admin Access Permissions', () => {
    it('allows admin on admin telemetry (/admin/stats)', async () => {
      const req = { user: admin, originalUrl: '/api/v1/admin/stats' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows admin to invoke getAdminStats controller', async () => {
      const req = { user: admin } as Request;
      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await adminController.getAdminStats(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            overview: expect.any(Object),
          }),
        })
      );
    });

    it('allows admin to access classroom cohort creation', async () => {
      const req = { user: admin, originalUrl: '/api/v1/classrooms' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows admin to access student resources', async () => {
      const req = { user: admin, originalUrl: '/api/v1/auth/me' } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('student', 'faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});

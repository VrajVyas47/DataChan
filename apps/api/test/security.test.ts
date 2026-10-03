import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole, requireAnyRole, requireOwnership } from '../src/middleware/auth';
import { AuthenticationError, AuthorizationError, ResourceNotFoundError } from '../src/errors';
import * as firebaseAdminModule from '../src/security/firebaseAdmin';
import * as mongoClientModule from '../src/database/mongoClient';
import * as auditModule from '../src/security/audit';
import { config } from '../src/config';
import * as adminController from '../src/modules/admin/adminController';
import * as authController from '../src/modules/auth/authController';
import * as classroomController from '../src/modules/classrooms/classroomController';
import * as databaseController from '../src/modules/databases/databaseController';
import * as workspaceController from '../src/modules/workspaces/workspaceController';

// Mock dependencies
vi.mock('../src/security/audit', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Comprehensive Security Test Suite', () => {
  let mockAuth: any;
  let mockDb: any;
  let mockUsersCollection: any;
  let mockResourcesCollection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUsersCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      insertOne: vi.fn(),
      countDocuments: vi.fn(),
    };

    mockResourcesCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };

    mockDb = {
      collection: vi.fn((name: string) => {
        if (name === 'users') return mockUsersCollection;
        return mockResourcesCollection;
      }),
      client: {
        db: vi.fn(() => ({
          collection: vi.fn(() => ({
            insertMany: vi.fn().mockResolvedValue({ acknowledged: true }),
          })),
        })),
      },
    };

    mockAuth = {
      verifySessionCookie: vi.fn(),
      verifyIdToken: vi.fn(),
      setCustomUserClaims: vi.fn(),
      revokeRefreshTokens: vi.fn(),
    };

    vi.spyOn(firebaseAdminModule, 'getFirebaseAuth').mockReturnValue(mockAuth);
    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb as any);
  });

  describe('1. Authoritative Session & Authentication Middleware (authMiddleware)', () => {
    it('rejects unauthenticated requests without session cookie or token (401)', async () => {
      const req = {
        cookies: {},
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
      expect(req.user).toBeUndefined();
    });

    it('completely ignores legacy dev headers (x-dev-role, x-dev-uid, x-dev-email) and fails closed', async () => {
      const req = {
        cookies: {},
        headers: {
          'x-dev-role': 'admin',
          'x-dev-uid': 'fake_admin_uid',
          'x-dev-email': 'attacker@dev.com',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
      expect(req.user).toBeUndefined();
    });

    it('rejects fake legacy bearer tokens (e.g. token_admin) with 401', async () => {
      const req = {
        cookies: {},
        headers: {
          authorization: 'Bearer token_admin',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has invalid format or signature'));

      await authMiddleware(req, res, next);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('token_admin', true);
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
      expect(req.user).toBeUndefined();
    });

    it('rejects invalid or expired session cookies and clears the cookie (401)', async () => {
      const req = {
        cookies: { [config.session.cookieName]: 'malformed_cookie_value' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifySessionCookie.mockRejectedValue(new Error('Firebase session cookie has expired'));

      await authMiddleware(req, res, next);

      expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith('malformed_cookie_value', true);
      expect(res.clearCookie).toHaveBeenCalledWith(config.session.cookieName, { path: '/' });
      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
    });

    it('rejects when authenticated Firebase UID has no Data-Chan MongoDB user record (401)', async () => {
      const req = {
        cookies: { [config.session.cookieName]: 'valid_session_cookie' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifySessionCookie.mockResolvedValue({ uid: 'fb_uid_unknown', email: 'unknown@test.com' });
      mockUsersCollection.findOne.mockResolvedValue(null);

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).toContain('User account not registered');
      expect(req.user).toBeUndefined();
    });

    it('denies access when user account status is suspended (403)', async () => {
      const req = {
        cookies: { [config.session.cookieName]: 'valid_session_cookie' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifySessionCookie.mockResolvedValue({ uid: 'fb_uid_suspended', email: 'suspended@test.com' });
      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_suspended',
        firebaseUid: 'fb_uid_suspended',
        email: 'suspended@test.com',
        username: 'suspended_user',
        role: 'student',
        status: 'suspended',
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('suspended');
      expect(req.user).toBeUndefined();
    });

    it('denies access when user account status is disabled (403)', async () => {
      const req = {
        cookies: { [config.session.cookieName]: 'valid_session_cookie' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifySessionCookie.mockResolvedValue({ uid: 'fb_uid_disabled', email: 'disabled@test.com' });
      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_disabled',
        firebaseUid: 'fb_uid_disabled',
        email: 'disabled@test.com',
        username: 'disabled_user',
        role: 'student',
        status: 'disabled',
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('disabled');
      expect(req.user).toBeUndefined();
    });

    it('successfully populates req.user and proceeds for active user with valid session', async () => {
      const req = {
        cookies: { [config.session.cookieName]: 'valid_session_cookie' },
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { clearCookie: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifySessionCookie.mockResolvedValue({ uid: 'fb_uid_123', email: 'alice@datachan.org' });
      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_123',
        firebaseUid: 'fb_uid_123',
        email: 'alice@datachan.org',
        username: 'alice',
        role: 'student',
        status: 'active',
      });

      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        userId: 'usr_123',
        firebaseUid: 'fb_uid_123',
        email: 'alice@datachan.org',
        username: 'alice',
        role: 'student',
        status: 'active',
      });
    });
  });

  describe('2. Role-Based Access Control (requireRole & requireAnyRole)', () => {
    it('returns 401 when request is not authenticated', async () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
    });

    it('returns 403 Forbidden when a student attempts to access admin route', async () => {
      const req = {
        user: {
          userId: 'usr_student',
          firebaseUid: 'fb_student',
          email: 'student@datachan.org',
          username: 'student1',
          role: 'student',
          status: 'active',
        },
        originalUrl: '/api/v1/admin/users',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Unauthorized access');
      expect(auditModule.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'FORBIDDEN_ATTEMPT' })
      );
    });

    it('returns 403 Forbidden when faculty attempts to access admin route', async () => {
      const req = {
        user: {
          userId: 'usr_prof',
          firebaseUid: 'fb_prof',
          email: 'prof@datachan.org',
          username: 'dr_smith',
          role: 'faculty',
          status: 'active',
        },
        originalUrl: '/api/v1/admin/users',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('allows admin to access admin route', async () => {
      const req = {
        user: {
          userId: 'usr_admin',
          firebaseUid: 'fb_admin',
          email: 'admin@datachan.org',
          username: 'sysadmin',
          role: 'admin',
          status: 'active',
        },
        originalUrl: '/api/v1/admin/users',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('requireAnyRole allows both faculty and admin, but denies student', async () => {
      const facultyReq = {
        user: { userId: '1', role: 'faculty', status: 'active' },
        originalUrl: '/api/v1/challenges/manage',
      } as Request;
      const adminReq = {
        user: { userId: '2', role: 'admin', status: 'active' },
        originalUrl: '/api/v1/challenges/manage',
      } as Request;
      const studentReq = {
        user: { userId: '3', role: 'student', status: 'active' },
        originalUrl: '/api/v1/challenges/manage',
      } as Request;
      const res = {} as Response;

      const middleware = requireAnyRole('faculty', 'admin');

      const nextFaculty = vi.fn();
      await middleware(facultyReq, res, nextFaculty);
      expect(nextFaculty).toHaveBeenCalledWith();

      const nextAdmin = vi.fn();
      await middleware(adminReq, res, nextAdmin);
      expect(nextAdmin).toHaveBeenCalledWith();

      const nextStudent = vi.fn();
      await middleware(studentReq, res, nextStudent);
      expect(nextStudent.mock.calls[0][0]).toBeInstanceOf(AuthorizationError);
    });
  });

  describe('3. Resource Ownership Policy (requireOwnership)', () => {
    it('allows resource owner to access resource', async () => {
      const req = {
        user: { userId: 'usr_alice', role: 'student' },
        params: { id: 'ws_123' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'ws_123',
        userId: 'usr_alice',
        name: 'My Workspace',
      });

      const middleware = requireOwnership('workspaces', 'id', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('denies access when resource belongs to another user (403)', async () => {
      const req = {
        user: { userId: 'usr_attacker', role: 'student' },
        params: { id: 'ws_victim' },
        originalUrl: '/api/v1/workspaces/ws_victim',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'ws_victim',
        userId: 'usr_victim',
        name: 'Secret Lab Data',
      });

      const middleware = requireOwnership('workspaces', 'id', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(auditModule.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'FORBIDDEN_ATTEMPT' })
      );
    });

    it('allows admin to bypass resource ownership checks', async () => {
      const req = {
        user: { userId: 'usr_admin', role: 'admin' },
        params: { id: 'ws_victim' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireOwnership('workspaces', 'id', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockResourcesCollection.findOne).not.toHaveBeenCalled();
    });

    it('returns 404 ResourceNotFoundError when resource does not exist', async () => {
      const req = {
        user: { userId: 'usr_alice', role: 'student' },
        params: { id: 'non_existent_id' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      mockResourcesCollection.findOne.mockResolvedValue(null);

      const middleware = requireOwnership('workspaces', 'id', 'userId');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ResourceNotFoundError);
      expect(err.statusCode).toBe(404);
    });
  });

  describe('4. Privilege Escalation Prevention in Registration & User Sync', () => {
    it('strictly whitelists profile updates in syncUser and rejects client role/status modifications', async () => {
      const req = {
        user: {
          userId: 'usr_existing',
          firebaseUid: 'fb_existing',
          email: 'user@datachan.org',
          username: 'user1',
          role: 'student',
          status: 'active',
        },
        body: {
          displayName: 'Updated Name',
          themePreference: 'dark',
          role: 'admin', // Malicious attempt to self-promote to admin
          status: 'suspended', // Malicious attempt to change status
        },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      mockUsersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_existing',
        displayName: 'Updated Name',
        role: 'student',
        status: 'active',
      });

      await authController.syncUser(req, res, next);

      expect(mockUsersCollection.updateOne).toHaveBeenCalledTimes(1);
      const updatePayload = mockUsersCollection.updateOne.mock.calls[0][1].$set;
      expect(updatePayload.displayName).toBe('Updated Name');
      expect(updatePayload.themePreference).toBe('dark');
      // SECURITY ASSERTION: role and status MUST NOT be included in updates
      expect(updatePayload.role).toBeUndefined();
      expect(updatePayload.status).toBeUndefined();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'student',
          }),
        })
      );
    });

    it('enforces role = "student" on new user provisioning in createSession', async () => {
      const req = {
        body: {
          idToken: 'valid_new_user_token',
          displayName: 'New Student',
          role: 'admin', // Malicious attempt to register as admin
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        cookie: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'fb_brand_new_uid',
        email: 'brandnew@datachan.org',
        name: 'New Student',
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      });

      mockAuth.createSessionCookie = vi.fn().mockResolvedValue('new_session_cookie');
      mockUsersCollection.findOne.mockImplementation(() => {
        if (mockUsersCollection.insertOne.mock.calls.length > 0) {
          return Promise.resolve({
            id: 'usr_new',
            role: 'student',
            status: 'active',
            email: 'brandnew@datachan.org',
          });
        }
        return Promise.resolve(null);
      });
      mockUsersCollection.insertOne.mockResolvedValue({ acknowledged: true });

      await authController.createSession(req, res, next);

      expect(mockUsersCollection.insertOne).toHaveBeenCalledTimes(1);
      const insertedDoc = mockUsersCollection.insertOne.mock.calls[0][0];
      // SECURITY ASSERTION: Registered user is forced to 'student' role
      expect(insertedDoc.role).toBe('student');
      expect(insertedDoc.status).toBe('active');
      expect(insertedDoc.email).toBe('brandnew@datachan.org');
      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('4b. Token Freshness, Account Takeover Protection & Concurrency', () => {
    it('rejects stale Firebase ID tokens when auth_time is older than 15 minutes', async () => {
      const req = {
        body: {
          idToken: 'stale_token',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { cookie: vi.fn(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      const twentyMinutesAgo = Math.floor(Date.now() / 1000) - 20 * 60;
      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'fb_stale_user',
        email: 'stale@datachan.org',
        auth_time: twentyMinutesAgo,
      });

      await authController.createSession(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Authentication session is too old');
    });

    it('rejects linking unverified Firebase account to legacy email (prevents account takeover)', async () => {
      const req = {
        body: {
          idToken: 'unverified_token',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { cookie: vi.fn(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'attacker_uid',
        email: 'victim@datachan.org',
        email_verified: false, // Attacker has not verified this email!
        auth_time: Math.floor(Date.now() / 1000),
      });

      // No user by firebaseUid, but exists by email
      mockUsersCollection.findOne.mockImplementation((query: any) => {
        if (query.firebaseUid) return Promise.resolve(null);
        if (query.email === 'victim@datachan.org') {
          return Promise.resolve({
            _id: 'mongo_victim_id',
            id: 'usr_victim',
            email: 'victim@datachan.org',
            role: 'student',
          });
        }
        return Promise.resolve(null);
      });

      await authController.createSession(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Email verification required before linking');
      expect(mockUsersCollection.updateOne).not.toHaveBeenCalled();
    });

    it('successfully links verified Firebase account to legacy email and purges legacy credentials', async () => {
      const req = {
        body: {
          idToken: 'verified_token',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { cookie: vi.fn(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'verified_fb_uid',
        email: 'legacy@datachan.org',
        email_verified: true, // Legitimate owner verified via Firebase!
        auth_time: Math.floor(Date.now() / 1000),
      });
      mockAuth.createSessionCookie = vi.fn().mockResolvedValue('new_session_cookie');

      let linked = false;
      mockUsersCollection.findOne.mockImplementation((query: any) => {
        if (query.firebaseUid === 'verified_fb_uid' && linked) {
          return Promise.resolve({
            _id: 'mongo_legacy_id',
            id: 'usr_legacy',
            firebaseUid: 'verified_fb_uid',
            email: 'legacy@datachan.org',
            role: 'student',
            status: 'active',
          });
        }
        if (query.email === 'legacy@datachan.org') {
          return Promise.resolve({
            _id: 'mongo_legacy_id',
            id: 'usr_legacy',
            email: 'legacy@datachan.org',
            role: 'student',
            status: 'active',
          });
        }
        return Promise.resolve(null);
      });

      mockUsersCollection.updateOne.mockImplementation(() => {
        linked = true;
        return Promise.resolve({ modifiedCount: 1 });
      });

      await authController.createSession(req, res, next);

      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { _id: 'mongo_legacy_id' },
        expect.objectContaining({
          $set: expect.objectContaining({
            firebaseUid: 'verified_fb_uid',
            emailVerified: true,
          }),
          $unset: expect.objectContaining({
            password: '',
            passwordHash: '',
            passwordSalt: '',
          }),
        })
      );
      expect(res.cookie).toHaveBeenCalled();
    });

    it('gracefully recovers from code 11000 duplicate key race condition in createSession', async () => {
      const req = {
        body: {
          idToken: 'concurrent_token',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = { status: vi.fn().mockReturnThis(), cookie: vi.fn(), json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'fb_concurrent_uid',
        email: 'concurrent@datachan.org',
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
      });
      mockAuth.createSessionCookie = vi.fn().mockResolvedValue('concurrent_session_cookie');

      let duplicateTriggered = false;
      mockUsersCollection.findOne.mockImplementation((query: any) => {
        if (duplicateTriggered) {
          return Promise.resolve({
            id: 'usr_winner',
            firebaseUid: 'fb_concurrent_uid',
            email: 'concurrent@datachan.org',
            role: 'student',
            status: 'active',
          });
        }
        return Promise.resolve(null);
      });

      const duplicateError: any = new Error('E11000 duplicate key error');
      duplicateError.code = 11000;
      mockUsersCollection.insertOne.mockImplementation(() => {
        duplicateTriggered = true;
        return Promise.reject(duplicateError);
      });

      await authController.createSession(req, res, next);

      // Verify it caught 11000, recovered the user record, and still issued the session cookie
      expect(res.cookie).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'usr_winner',
            }),
          }),
        })
      );
    });
  });

  describe('5. Admin Role Promotion & Self-Demotion Protection', () => {
    it('blocks admin from demoting themselves', async () => {
      const req = {
        user: {
          userId: 'usr_admin1',
          role: 'admin',
          firebaseUid: 'fb_admin1',
        },
        params: { userId: 'usr_admin1' },
        body: { role: 'student' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      await adminController.updateUserRole(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('cannot revoke their own admin privileges');
      expect(mockUsersCollection.findOneAndUpdate).not.toHaveBeenCalled();
      expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();
    });

    it('blocks demoting an administrator when they are the last active administrator', async () => {
      const req = {
        user: {
          userId: 'usr_admin1',
          role: 'admin',
          firebaseUid: 'fb_admin1',
        },
        params: { userId: 'usr_admin2' },
        body: { role: 'student' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_admin2',
        role: 'admin',
        status: 'active',
      });
      // Exactly 1 active administrator remaining
      mockUsersCollection.countDocuments.mockResolvedValue(1);

      await adminController.updateUserRole(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('must maintain at least one active administrator');
      expect(mockUsersCollection.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('blocks suspending or disabling the last active administrator', async () => {
      const req = {
        user: {
          userId: 'usr_admin1',
          role: 'admin',
          firebaseUid: 'fb_admin1',
        },
        params: { userId: 'usr_admin2' },
        body: { status: 'suspended' },
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_admin2',
        role: 'admin',
        status: 'active',
      });
      // Exactly 1 active administrator remaining
      mockUsersCollection.countDocuments.mockResolvedValue(1);

      await adminController.updateUserStatus(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('must maintain at least one active administrator');
      expect(mockUsersCollection.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows admin to promote another user and syncs Firebase custom claims, revokes refresh tokens & logs audit', async () => {
      const req = {
        user: {
          userId: 'usr_admin1',
          role: 'admin',
          firebaseUid: 'fb_admin1',
        },
        params: { userId: 'usr_target_student' },
        body: { role: 'faculty' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = { json: vi.fn() } as unknown as Response;
      const next = vi.fn();

      mockUsersCollection.findOne.mockResolvedValue({
        id: 'usr_target_student',
        firebaseUid: 'fb_target_student',
        email: 'prof_candidate@datachan.org',
        username: 'prof_candidate',
        role: 'student',
        status: 'active',
      });
      mockUsersCollection.findOneAndUpdate.mockResolvedValue({
        id: 'usr_target_student',
        firebaseUid: 'fb_target_student',
        email: 'prof_candidate@datachan.org',
        username: 'prof_candidate',
        role: 'faculty',
        status: 'active',
      });

      await adminController.updateUserRole(req, res, next);

      expect(mockUsersCollection.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'usr_target_student' },
        expect.objectContaining({
          $set: expect.objectContaining({ role: 'faculty' }),
        }),
        { returnDocument: 'after' }
      );
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('fb_target_student', { role: 'faculty' });
      expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith('fb_target_student');
      expect(auditModule.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_UPDATED',
          details: expect.objectContaining({ previousRole: 'student', newRole: 'faculty' }),
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ role: 'faculty' }),
        })
      );
    });
  });

  describe('6. Environment & Firebase Admin Initialization Security', () => {
    it('enforces consistent 7-day session cookie expiration by default', () => {
      expect(config.session.expirationDays).toBe(7);
      expect(config.session.cookieName).toBe('datachan_session');
    });

    it('enforces single source of truth for MongoDB connectivity', () => {
      expect(config.mongodb.uri).toBeDefined();
      expect(config.mongodb.platformDb).toBe('datachan_platform');
    });

    it('detects missing Firebase Admin credentials and reports configuration state correctly', () => {
      const originalEmulator = config.firebase.emulatorHost;
      const originalEmail = config.firebase.clientEmail;
      const originalKey = config.firebase.privateKey;

      try {
        config.firebase.emulatorHost = '';
        config.firebase.clientEmail = '';
        config.firebase.privateKey = '';

        expect(firebaseAdminModule.isFirebaseConfigured()).toBe(false);
      } finally {
        config.firebase.emulatorHost = originalEmulator;
        config.firebase.clientEmail = originalEmail;
        config.firebase.privateKey = originalKey;
      }
    });

    it('recognizes Firebase Auth Emulator when emulator host is provided', () => {
      const originalEmulator = config.firebase.emulatorHost;
      try {
        config.firebase.emulatorHost = 'localhost:9099';
        expect(firebaseAdminModule.isFirebaseConfigured()).toBe(true);
      } finally {
        config.firebase.emulatorHost = originalEmulator;
      }
    });

    it('throws startup error when credentials and emulator host are missing', () => {
      const originalEmulator = config.firebase.emulatorHost;
      const originalEmail = config.firebase.clientEmail;
      const originalKey = config.firebase.privateKey;
      const originalGoogleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      try {
        config.firebase.emulatorHost = '';
        config.firebase.clientEmail = '';
        config.firebase.privateKey = '';
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

        expect(() => firebaseAdminModule.initFirebaseAdmin()).toThrowError(
          /Firebase Admin configuration missing/
        );
      } finally {
        config.firebase.emulatorHost = originalEmulator;
        config.firebase.clientEmail = originalEmail;
        config.firebase.privateKey = originalKey;
        if (originalGoogleAppCreds) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = originalGoogleAppCreds;
        }
      }
    });
  });

  describe('7. Strict Student Authorization Boundary & Privileged Operation Rejection Suite', () => {
    const studentUser = {
      userId: 'usr_student_alpha',
      firebaseUid: 'fb_student_alpha',
      email: 'student.alpha@datachan.org',
      username: 'student_alpha',
      role: 'student' as const,
      status: 'active' as const,
    };

    const victimUser = {
      userId: 'usr_victim_beta',
      firebaseUid: 'fb_victim_beta',
      email: 'victim.beta@datachan.org',
      username: 'victim_beta',
      role: 'student' as const,
      status: 'active' as const,
    };

    it('rejects student attempting to create a classroom cohort via requireRole (403)', async () => {
      const req = {
        user: studentUser,
        originalUrl: '/api/v1/classrooms',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Required role: [faculty, admin]');
    });

    it('rejects student attempting to view cohort roster via requireRole (403)', async () => {
      const req = {
        user: studentUser,
        originalUrl: '/api/v1/classrooms/cls_cs101/roster',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('faculty', 'admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student in createClassroom controller even if middleware is bypassed (defense-in-depth)', async () => {
      const req = {
        user: studentUser,
        body: { name: 'CS-404 Exploits' },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.createClassroom(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Only Faculty or Administrative instructors can create classroom cohorts');
    });

    it('rejects student in getClassroomRoster controller for unauthorized cohort', async () => {
      const mockClassroom = {
        id: 'cls_cs101',
        facultyId: 'usr_faculty_gamma',
        enrolledStudentIds: [studentUser.userId],
      };
      mockResourcesCollection.findOne.mockResolvedValue(mockClassroom);

      const req = {
        user: studentUser,
        params: { id: 'cls_cs101' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await classroomController.getClassroomRoster(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Only the assigned faculty instructor or administrator can view this cohort roster');
    });

    it('rejects student attempting to access admin telemetry (GET /admin/stats) via requireRole (403)', async () => {
      const req = {
        user: studentUser,
        originalUrl: '/api/v1/admin/stats',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student attempting role escalation (PATCH /admin/users/:userId/role) via requireRole (403)', async () => {
      const req = {
        user: studentUser,
        originalUrl: `/api/v1/admin/users/${studentUser.userId}/role`,
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student attempting maintenance purge (POST /admin/maintenance/clean-orphans) via requireRole (403)', async () => {
      const req = {
        user: studentUser,
        originalUrl: '/api/v1/admin/maintenance/clean-orphans',
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('rejects student attempting to access another user\'s virtual database (403)', async () => {
      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'vdb_victim',
        userId: victimUser.userId,
        name: 'Victim DB',
        physicalNamespace: 'db_victim_123',
      });

      const req = {
        user: studentUser,
        params: { id: 'vdb_victim' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await databaseController.getDatabase(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('You do not own this database');
    });

    it('rejects student attempting to delete another user\'s virtual database (403)', async () => {
      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'vdb_victim',
        userId: victimUser.userId,
        name: 'Victim DB',
        physicalNamespace: 'db_victim_123',
      });

      const req = {
        user: studentUser,
        params: { id: 'vdb_victim' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await databaseController.deleteDatabase(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('You do not own this database');
    });

    it('rejects student attempting to access another user\'s workspace (403)', async () => {
      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'ws_victim',
        userId: victimUser.userId,
        name: 'Victim Workspace',
      });

      const req = {
        user: studentUser,
        params: { id: 'ws_victim' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await workspaceController.getWorkspace(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('You do not own this workspace');
    });

    it('rejects student attempting to delete another user\'s workspace (403)', async () => {
      mockResourcesCollection.findOne.mockResolvedValue({
        id: 'ws_victim',
        userId: victimUser.userId,
        name: 'Victim Workspace',
      });

      const req = {
        user: studentUser,
        params: { id: 'ws_victim' },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await workspaceController.deleteWorkspace(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('You do not own this workspace');
    });

    it('ignores client-supplied role in syncUser and does not escalate student privilege', async () => {
      const req = {
        user: studentUser,
        body: {
          role: 'admin',
          displayName: 'Updated Student Name',
          themePreference: 'cyber-emerald',
        },
      } as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      mockUsersCollection.findOne.mockResolvedValue({
        ...studentUser,
        displayName: 'Updated Student Name',
        themePreference: 'cyber-emerald',
      });

      await authController.syncUser(req, res, next);

      expect(mockUsersCollection.updateOne).toHaveBeenCalledWith(
        { id: studentUser.userId },
        expect.objectContaining({
          $set: expect.not.objectContaining({ role: 'admin' }),
        })
      );
      expect(res.json).toHaveBeenCalled();
    });
  });
});


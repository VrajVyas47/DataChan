import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as adminController from '../src/modules/admin/adminController';
import * as mongoClientModule from '../src/database/mongoClient';
import * as firebaseAdminModule from '../src/security/firebaseAdmin';

vi.mock('../src/security/audit', () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Role Change Session Management Tests', () => {
  let mockDb: any;
  let mockUsersCol: any;
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUsersCol = {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      countDocuments: vi.fn().mockResolvedValue(10), // mock for active admins
    };

    mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'users') return mockUsersCol;
        return {
          findOne: vi.fn(),
          findOneAndUpdate: vi.fn(),
        };
      }),
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb as any);

    mockAuth = {
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(firebaseAdminModule, 'getFirebaseAuth').mockReturnValue(mockAuth as any);
  });

  describe('updateUserRole', () => {
    it('updates user role without revoking the session', async () => {
      const targetUser = {
        id: 'usr_target_123',
        firebaseUid: 'fb_uid_456',
        role: 'student',
        email: 'test@datachan.test',
      };

      mockUsersCol.findOne.mockResolvedValue(targetUser);
      mockUsersCol.findOneAndUpdate.mockResolvedValue({
        ...targetUser,
        role: 'faculty',
      });

      const req = {
        params: { userId: 'usr_target_123' },
        body: { role: 'faculty' },
        user: { userId: 'usr_admin', role: 'admin' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      await adminController.updateUserRole(req, res, next);

      // Verify db update was called
      expect(mockUsersCol.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'usr_target_123' },
        expect.objectContaining({ $set: expect.objectContaining({ role: 'faculty' }) }),
        { returnDocument: 'after' }
      );

      // Verify custom claims were set
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('fb_uid_456', { role: 'faculty' });

      // Verify session was NOT revoked (this is the core fix)
      expect(mockAuth.revokeRefreshTokens).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('updateUserStatus', () => {
    it('revokes session when suspending an account', async () => {
      const targetUser = {
        id: 'usr_target_123',
        firebaseUid: 'fb_uid_456',
        role: 'student',
        status: 'active',
        email: 'test@datachan.test',
      };

      mockUsersCol.findOne.mockResolvedValue(targetUser);
      mockUsersCol.findOneAndUpdate.mockResolvedValue({
        ...targetUser,
        status: 'suspended',
      });

      const req = {
        params: { userId: 'usr_target_123' },
        body: { status: 'suspended' },
        user: { userId: 'usr_admin', role: 'admin' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      await adminController.updateUserStatus(req, res, next);

      // Verify custom claims weren't touched
      expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();

      // Verify session WAS revoked
      expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith('fb_uid_456');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('does not revoke session when reactivating an account', async () => {
      const targetUser = {
        id: 'usr_target_123',
        firebaseUid: 'fb_uid_456',
        role: 'student',
        status: 'suspended',
        email: 'test@datachan.test',
      };

      mockUsersCol.findOne.mockResolvedValue(targetUser);
      mockUsersCol.findOneAndUpdate.mockResolvedValue({
        ...targetUser,
        status: 'active',
      });

      const req = {
        params: { userId: 'usr_target_123' },
        body: { status: 'active' },
        user: { userId: 'usr_admin', role: 'admin' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      await adminController.updateUserStatus(req, res, next);

      // Verify session WAS NOT revoked
      expect(mockAuth.revokeRefreshTokens).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});

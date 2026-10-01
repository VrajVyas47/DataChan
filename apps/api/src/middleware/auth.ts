import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../security/firebaseAdmin';
import { AuthenticationError, AuthorizationError, ResourceNotFoundError } from '../errors';
import { logger } from '../logging/logger';
import { getPlatformDb } from '../database/mongoClient';
import { config } from '../config';
import { UserRole, UserStatus } from '@datachan/shared-types';
import { logSecurityEvent } from '../security/audit';

export interface AuthContext {
  userId: string;
  firebaseUid: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

/**
 * Authoritative Session & Authentication Middleware.
 * Strictly verifies the Firebase session cookie (or Bearer ID token).
 * Fails closed: NO dev headers, NO fake tokens, NO unauthenticated fallbacks.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionCookie = req.cookies?.[config.session.cookieName];
  const authHeader = req.headers.authorization;

  let decodedUid: string | null = null;
  let decodedEmail: string | null = null;

  try {
    const auth = getFirebaseAuth();

    if (sessionCookie) {
      // 1. Primary Authentication: Verify Firebase Session Cookie with checkRevoked = true
      const decodedSession = await auth.verifySessionCookie(sessionCookie, true);
      decodedUid = decodedSession.uid;
      decodedEmail = decodedSession.email || null;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // 2. Secondary Authentication: Verify Firebase ID Token for API clients
      const idToken = authHeader.split('Bearer ')[1].trim();
      if (!idToken) {
        throw new AuthenticationError('Malformed Bearer token');
      }
      const decodedToken = await auth.verifyIdToken(idToken, true);
      decodedUid = decodedToken.uid;
      decodedEmail = decodedToken.email || null;
    } else {
      // No session cookie and no Bearer token provided - Fail Closed
      return next(new AuthenticationError('Authentication required. No session cookie or token provided.'));
    }

    if (!decodedUid) {
      return next(new AuthenticationError('Invalid authentication credentials'));
    }

    // 3. Load authoritative Data-Chan User record from MongoDB
    const db = getPlatformDb();
    const user = await db.collection('users').findOne({ firebaseUid: decodedUid });

    if (!user) {
      logger.warn(`Authenticated Firebase UID ${decodedUid} has no associated MongoDB user record`);
      return next(new AuthenticationError('User account not registered in laboratory system'));
    }

    // 4. Verify Account Status (active, suspended, disabled)
    const status: UserStatus = (user.status as UserStatus) || 'active';
    if (status !== 'active') {
      await logSecurityEvent({
        action: 'FORBIDDEN_ATTEMPT',
        userId: user.id,
        firebaseUid: decodedUid,
        details: { reason: `Account status is ${status}` },
        req,
      });
      return next(new AuthorizationError(`Account is ${status}. Access to laboratory platform is restricted.`));
    }

    // 5. Attach authenticated principal to request
    req.user = {
      userId: user.id,
      firebaseUid: decodedUid,
      email: user.email || decodedEmail || '',
      username: user.username,
      role: (user.role as UserRole) || 'student',
      status,
    };

    next();
  } catch (err: any) {
    logger.warn(`Authentication failure from ${req.ip}: ${err.message}`);
    // Clear invalid session cookie if present
    if (sessionCookie) {
      res.clearCookie(config.session.cookieName, { path: '/' });
    }
    return next(new AuthenticationError('Invalid or expired authentication session', { original: err.message }));
  }
}

/**
 * Role-Based Access Control Middleware.
 * Enforces that the authenticated user possesses one of the allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      await logSecurityEvent({
        action: 'FORBIDDEN_ATTEMPT',
        userId: req.user.userId,
        firebaseUid: req.user.firebaseUid,
        details: {
          attemptedRoute: req.originalUrl,
          requiredRoles: allowedRoles,
          currentRole: req.user.role,
        },
        req,
      });

      return next(
        new AuthorizationError(
          `Unauthorized access. Required role: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
        )
      );
    }

    next();
  };
}

export const requireAnyRole = requireRole;

/**
 * Resource Ownership Verification Middleware.
 * Validates that a requested resource belongs to the authenticated user.
 */
export function requireOwnership(
  collectionName: string,
  idParamKey: string = 'id',
  ownerField: string = 'userId'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Admins have supervisory access to resources
    if (req.user.role === 'admin') {
      return next();
    }

    const rawParam = req.params[idParamKey];
    const resourceId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!resourceId) {
      return next(new ResourceNotFoundError(collectionName, 'unknown'));
    }

    try {
      const db = getPlatformDb();
      const resource = await db.collection(collectionName).findOne({ id: resourceId });

      if (!resource) {
        return next(new ResourceNotFoundError(collectionName, resourceId));
      }

      if (resource[ownerField] !== req.user.userId) {
        await logSecurityEvent({
          action: 'FORBIDDEN_ATTEMPT',
          userId: req.user.userId,
          details: {
            collection: collectionName,
            resourceId,
            resourceOwner: resource[ownerField],
          },
          req,
        });

        return next(new AuthorizationError('You do not have permission to access or modify this resource'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

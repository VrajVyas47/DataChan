import { Request } from 'express';
import { getPlatformDb } from '../database/mongoClient';
import { logger } from '../logging/logger';

export type SecurityAuditAction =
  | 'LOGIN_SESSION_CREATED'
  | 'LOGOUT'
  | 'ROLE_UPDATED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_ACTIVATED'
  | 'UNAUTHORIZED_ATTEMPT'
  | 'FORBIDDEN_ATTEMPT'
  | 'ADMIN_BOOTSTRAP';

export interface SecurityAuditEvent {
  action: SecurityAuditAction;
  userId?: string;
  firebaseUid?: string;
  targetUserId?: string;
  details?: Record<string, any>;
  req?: Request;
}

export async function logSecurityEvent(event: SecurityAuditEvent): Promise<void> {
  try {
    const db = getPlatformDb();
    const ip = event.req ? (event.req.headers['x-forwarded-for'] as string) || event.req.ip || 'unknown' : 'internal';
    const userAgent = event.req ? (event.req.headers['user-agent'] as string) || 'unknown' : 'system';

    // Sanitize any potential secret values in details
    const cleanDetails: Record<string, any> = {};
    if (event.details) {
      for (const [key, value] of Object.entries(event.details)) {
        if (/token|password|secret|cookie|key/i.test(key)) {
          cleanDetails[key] = '[REDACTED]';
        } else {
          cleanDetails[key] = value;
        }
      }
    }

    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: event.action,
      userId: event.userId || 'anonymous',
      firebaseUid: event.firebaseUid,
      targetUserId: event.targetUserId,
      ip,
      userAgent,
      details: cleanDetails,
      timestamp: new Date().toISOString(),
    };

    await db.collection('security_audit_logs').insertOne(auditRecord);
    logger.info(`[SECURITY AUDIT] ${event.action} by ${event.userId || 'anonymous'} from ${ip}`);
  } catch (err: any) {
    logger.error('Failed to record security audit log', err);
  }
}

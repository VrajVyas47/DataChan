import dotenv from 'dotenv';
dotenv.config();

import { connectMongo, getPlatformDb, closeMongo } from '../database/mongoClient';
import { getFirebaseAuth, isFirebaseConfigured } from '../security/firebaseAdmin';
import { logger } from '../logging/logger';

async function bootstrapAdmin() {
  const targetIdentifier = process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!targetIdentifier) {
    console.error('\nUsage: npm run bootstrap:admin -- <email-or-firebase-uid>');
    console.error('Example: npm run bootstrap:admin -- admin@data-chan.edu\n');
    process.exit(1);
  }

  logger.info(`Starting Admin Bootstrap for identifier: ${targetIdentifier}`);

  try {
    await connectMongo();
    const db = getPlatformDb();

    let firebaseUid: string | null = null;
    let email: string = targetIdentifier.toLowerCase().trim();
    let displayName: string = email.split('@')[0];

    // 1. Verify Firebase Admin connectivity
    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        let fbUser;
        if (targetIdentifier.includes('@')) {
          fbUser = await auth.getUserByEmail(email);
        } else {
          fbUser = await auth.getUser(targetIdentifier);
        }
        firebaseUid = fbUser.uid;
        email = fbUser.email || email;
        displayName = fbUser.displayName || displayName;

        // Set Firebase Custom Claims
        await auth.setCustomUserClaims(firebaseUid, { role: 'admin' });
        logger.info(`Updated Firebase custom claims for UID: ${firebaseUid} -> { role: 'admin' }`);
      } catch (fbErr: any) {
        logger.warn(`Firebase user lookup failed or skipped: ${fbErr.message}`);
        if (!firebaseUid && !targetIdentifier.includes('@')) {
          firebaseUid = targetIdentifier;
        }
      }
    } else {
      logger.warn('Firebase Admin is not configured. Updating local MongoDB record only.');
    }

    // 2. Query MongoDB for existing user
    const existing = await db.collection('users').findOne({
      $or: [{ email }, { firebaseUid }, { id: targetIdentifier }],
    });

    const now = new Date().toISOString();

    if (existing) {
      await db.collection('users').updateOne(
        { _id: existing._id },
        {
          $set: {
            role: 'admin',
            status: 'active',
            updatedAt: now,
            ...(firebaseUid ? { firebaseUid } : {}),
          },
        }
      );
      logger.info(`Promoted existing user "${existing.displayName}" (${existing.email}) to role: admin in MongoDB.`);
    } else {
      const userId = `usr_admin_${Date.now()}`;
      const workspaceId = `ws_admin_${Date.now()}`;

      await db.collection('users').insertOne({
        id: userId,
        firebaseUid: firebaseUid || `fb_${Date.now()}`,
        email,
        username: displayName.replace(/\s+/g, '_').toLowerCase(),
        displayName,
        role: 'admin',
        status: 'active',
        emailVerified: true,
        xp: 5000,
        level: 50,
        streakDays: 30,
        activeWorkspaceId: workspaceId,
        themePreference: 'lavender-light',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });

      await db.collection('workspaces').insertOne({
        id: workspaceId,
        userId,
        name: `${displayName}'s Admin Workspace`,
        description: 'Primary Administrative Sandbox',
        createdAt: now,
        updatedAt: now,
      });

      logger.info(`Created new Administrator account for "${displayName}" (${email}) in MongoDB.`);
    }

    // 3. Record Security Audit Log
    await db.collection('security_audit_logs').insertOne({
      id: `audit_bootstrap_${Date.now()}`,
      action: 'ADMIN_BOOTSTRAP',
      userId: 'SYSTEM_CLI',
      targetUserId: email,
      details: { promotedEmail: email, firebaseUid },
      timestamp: now,
      ip: '127.0.0.1',
      userAgent: 'CLI_BOOTSTRAP_TOOL',
    });

    console.log(`\n Successfully bootstrapped Administrator: ${email}`);
    console.log('Role: admin | Status: active | Custom Claims: { role: "admin" }\n');

    await closeMongo();
    process.exit(0);
  } catch (err: any) {
    logger.error('Admin bootstrap failed', err);
    console.error('\n❌ Admin bootstrap failed:', err.message, '\n');
    await closeMongo();
    process.exit(1);
  }
}

bootstrapAdmin();

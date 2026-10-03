import * as admin from 'firebase-admin';
import { config } from '../config';
import { logger } from '../logging/logger';
import { AuthenticationError } from '../errors';

let initialized = false;

/**
 * Centralized, singleton Firebase Admin SDK initializer.
 * Supports:
 * 1. Firebase Auth Emulator (FIREBASE_AUTH_EMULATOR_HOST)
 * 2. Service Account Key (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 3. Default Application Credentials (GOOGLE_APPLICATION_CREDENTIALS)
 */
export function initFirebaseAdmin(): admin.app.App {
  if (initialized && admin.apps.length > 0) {
    return admin.app();
  }

  // 1. Firebase Auth Emulator (FIREBASE_AUTH_EMULATOR_HOST)
  if (config.firebase.emulatorHost) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = config.firebase.emulatorHost;
    const projectId = config.firebase.projectId || 'demo-datachan';
    try {
      const app = admin.initializeApp({
        projectId,
      });
      initialized = true;
      logger.info(
        `Firebase Admin SDK initialized using Auth Emulator at ${config.firebase.emulatorHost} (projectId: ${projectId})`
      );
      return app;
    } catch (err: any) {
      logger.error('Failed to initialize Firebase Admin with Auth Emulator', err);
      throw new Error(`Firebase Admin emulator initialization failed: ${err.message}`);
    }
  }

  // 2. Explicit Service Account credentials in environment
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    try {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
        projectId: config.firebase.projectId,
      });
      initialized = true;
      logger.info('Firebase Admin SDK initialized successfully with service account credentials');
      return app;
    } catch (err: any) {
      logger.error('Failed to initialize Firebase Admin with service account credentials', err);
      throw new Error(`Firebase Admin initialization failed: ${err.message}`);
    }
  }

  // 3. Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const app = admin.initializeApp();
      initialized = true;
      logger.info('Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS');
      return app;
    } catch (err: any) {
      logger.error('Failed to initialize Firebase Admin via default credentials', err);
      throw new Error(`Firebase Admin initialization failed: ${err.message}`);
    }
  }

  // 4. Missing required credentials - Fail closed
  const missingReason =
    'Firebase Admin configuration missing. In development, configure FIREBASE_AUTH_EMULATOR_HOST (e.g. localhost:9099) and FIREBASE_PROJECT_ID, or provide service account credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). In production, service account credentials or GOOGLE_APPLICATION_CREDENTIALS are strictly required.';
  logger.error(missingReason);
  throw new Error(missingReason);
}

export function isFirebaseConfigured(): boolean {
  if (initialized && admin.apps.length > 0) return true;
  if (config.firebase.emulatorHost) return true;
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) return true;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  return false;
}

export function getFirebaseAuth(): admin.auth.Auth {
  if (!initialized || admin.apps.length === 0) {
    initFirebaseAdmin();
  }
  return admin.auth();
}

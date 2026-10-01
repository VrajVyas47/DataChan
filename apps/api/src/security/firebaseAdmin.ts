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

  // Check if Firebase Auth emulator is running
  if (config.firebase.emulatorHost) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = config.firebase.emulatorHost;
    logger.info(`Connecting Firebase Admin to Auth Emulator at ${config.firebase.emulatorHost}`);
  }

  // 1. Explicit Service Account credentials in environment
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

  // 2. Project ID only (used with Firebase Auth Emulator or Google Cloud environment)
  if (config.firebase.projectId) {
    try {
      const app = admin.initializeApp({
        projectId: config.firebase.projectId,
      });
      initialized = true;
      logger.info(`Firebase Admin SDK initialized with projectId: ${config.firebase.projectId}`);
      return app;
    } catch (err: any) {
      logger.error('Failed to initialize Firebase Admin with projectId', err);
      throw new Error(`Firebase Admin initialization failed: ${err.message}`);
    }
  }

  // 3. Fallback to GOOGLE_APPLICATION_CREDENTIALS if present
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

  logger.warn(
    'Firebase Admin credentials not found. Authentication requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  );
  throw new Error(
    'Firebase Admin SDK is not configured. Please supply Firebase credentials in environment variables.'
  );
}

export function isFirebaseConfigured(): boolean {
  if (initialized && admin.apps.length > 0) return true;
  return !!(
    (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) ||
    config.firebase.emulatorHost ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

export function getFirebaseAuth(): admin.auth.Auth {
  if (!initialized || admin.apps.length === 0) {
    initFirebaseAdmin();
  }
  return admin.auth();
}

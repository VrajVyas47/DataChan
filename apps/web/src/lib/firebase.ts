import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  connectAuthEmulator,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export function isFirebaseClientConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getClientApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!isFirebaseClientConfigured()) {
    // Return dummy initialization in dev if needed, or throw
    console.warn(
      '[Firebase Client] Warning: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.'
    );
  }
  return initializeApp(firebaseConfig);
}

const app = getClientApp();
export const auth: Auth = getAuth(app);

// Connect to local Firebase Auth Emulator if configured
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL) {
  try {
    connectAuthEmulator(auth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL, { disableWarnings: true });
    console.info(`[Firebase Client] Connected to Auth Emulator at ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL}`);
  } catch {
    // Ignore duplicate emulator connection errors during hot reloads
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<{ user: any; token: string }> {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase Authentication is not configured. Please supply NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const token = await cred.user.getIdToken();
    return { user: cred.user, token };
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ user: any; token: string }> {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase Authentication is not configured. Please supply NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.');
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    const token = await cred.user.getIdToken();
    return { user: cred.user, token };
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function loginWithGoogle(): Promise<{ user: any; token: string }> {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase Authentication is not configured.');
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const token = await cred.user.getIdToken();
    return { user: cred.user, token };
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function resetPassword(email: string): Promise<void> {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase Authentication is not configured.');
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err: any) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {
    // Ignore signout cleanup errors
  }
}

/**
 * Maps raw Firebase authentication error codes to clean, user-friendly security messages.
 */
function mapFirebaseAuthError(err: any): string {
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact your system administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email address or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 8 characters with a mix of letters and numbers.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing authentication.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few moments before trying again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection.';
    default:
      return err.message || 'Authentication could not be completed.';
  }
}

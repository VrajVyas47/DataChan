import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Firebase Auth Emulator Local Persistence Configuration & Integrity', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const gitignorePath = path.join(rootDir, '.gitignore');
  const emulatorDataDir = path.join(rootDir, '.firebase-emulator-data');
  const exportMetadataPath = path.join(emulatorDataDir, 'firebase-export-metadata.json');
  const accountsJsonPath = path.join(emulatorDataDir, 'auth_export', 'accounts.json');

  it('1. verifies root package.json configures persistent emulator startup with --import and --export-on-exit', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts.emulator).toBeDefined();
    expect(pkg.scripts.emulator).toContain('--import=.firebase-emulator-data');
    expect(pkg.scripts.emulator).toContain('--export-on-exit');

    expect(pkg.scripts['emulator:auth']).toBeDefined();
    expect(pkg.scripts['emulator:auth']).toContain('--import=.firebase-emulator-data');
    expect(pkg.scripts['emulator:auth']).toContain('--export-on-exit');

    expect(pkg.scripts['emulator:export']).toBeDefined();
    expect(pkg.scripts['emulator:export']).toContain('emulators:export .firebase-emulator-data');
  });

  it('2. verifies .gitignore excludes .firebase-emulator-data/ from source control', () => {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toMatch(/\.firebase-emulator-data\/?/);
  });

  it('3. verifies persistent emulator metadata and auth export exist on disk', () => {
    expect(fs.existsSync(emulatorDataDir)).toBe(true);
    expect(fs.existsSync(exportMetadataPath)).toBe(true);
    expect(fs.existsSync(accountsJsonPath)).toBe(true);

    const metadata = JSON.parse(fs.readFileSync(exportMetadataPath, 'utf8'));
    expect(metadata.auth).toBeDefined();
    expect(metadata.auth.path).toBe('auth_export');
  });

  it('4. verifies accounts.json contains all 3 required development role accounts', () => {
    const accountsData = JSON.parse(fs.readFileSync(accountsJsonPath, 'utf8'));
    expect(Array.isArray(accountsData.users)).toBe(true);
    expect(accountsData.users.length).toBeGreaterThanOrEqual(3);

    const emails = accountsData.users.map((u: any) => u.email);
    expect(emails).toContain('student@datachan.test');
    expect(emails).toContain('faculty@datachan.test');
    expect(emails).toContain('admin@datachan.test');

    const student = accountsData.users.find((u: any) => u.email === 'student@datachan.test');
    const faculty = accountsData.users.find((u: any) => u.email === 'faculty@datachan.test');
    const admin = accountsData.users.find((u: any) => u.email === 'admin@datachan.test');

    expect(student.localId).toBeTruthy();
    expect(faculty.localId).toBeTruthy();
    expect(admin.localId).toBeTruthy();

    // Verify unique UIDs
    const uids = [student.localId, faculty.localId, admin.localId];
    const uniqueUids = new Set(uids);
    expect(uniqueUids.size).toBe(3);

    // Verify custom role claims
    expect(JSON.parse(student.customAttributes || '{}').role).toBe('student');
    expect(JSON.parse(faculty.customAttributes || '{}').role).toBe('faculty');
    expect(JSON.parse(admin.customAttributes || '{}').role).toBe('admin');
  });

  it('5. verifies safety against production credential leakage', () => {
    const rootEnvPath = path.join(rootDir, '.env');
    if (fs.existsSync(rootEnvPath)) {
      const rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
      expect(rootEnv).not.toContain('FIREBASE_PRIVATE_KEY=-----BEGIN');
      expect(rootEnv).not.toContain('FIREBASE_CLIENT_EMAIL=');
      expect(rootEnv).toContain('FIREBASE_AUTH_EMULATOR_HOST=localhost:9099');
      expect(rootEnv).toContain('FIREBASE_PROJECT_ID=demo-datachan');
    }
  });
});

import dotenv from 'dotenv';
dotenv.config();

import { connectMongo, getPlatformDb, getNamespaceDb, closeMongo } from '../database/mongoClient';
import { getFirebaseAuth, isFirebaseConfigured, initFirebaseAdmin } from '../security/firebaseAdmin';
import { logger } from '../logging/logger';
import { UserRole } from '@datachan/shared-types';
import { COLLECTION_VALIDATORS } from '../database/schema/validators';

export interface DevAccountConfig {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  xp: number;
  level: number;
}

export const DEV_ACCOUNTS: DevAccountConfig[] = [
  {
    email: 'student@datachan.test',
    password: 'Test@12345',
    displayName: 'Alex Rivers (Student)',
    role: 'student',
    xp: 250,
    level: 3,
  },
  {
    email: 'faculty@datachan.test',
    password: 'Test@12345',
    displayName: 'Prof. Marcus Vance (Faculty)',
    role: 'faculty',
    xp: 1500,
    level: 15,
  },
  {
    email: 'admin@datachan.test',
    password: 'Test@12345',
    displayName: 'SysAdmin Data-Chan (Admin)',
    role: 'admin',
    xp: 5000,
    level: 50,
  },
];

export interface SeedAuditItem {
  entity: string;
  identifier: string;
  action: 'created' | 'reused' | 'updated' | 'skipped' | 'failed';
  details?: string;
}

/**
 * Formats raw MongoDB validation errors (Code 121) into human-readable,
 * actionable diagnostics showing exact missing fields and schema rules.
 */
export function formatMongoValidationError(err: any): string {
  if (!err) return 'Unknown error';

  const isValidationError =
    err.code === 121 ||
    err.name === 'MongoServerError' ||
    (typeof err.message === 'string' && err.message.includes('Document failed validation'));

  if (isValidationError) {
    const lines: string[] = [];
    lines.push(`================================================================================`);
    lines.push(`MongoDB Document Validation Failure (Code 121)`);
    lines.push(`================================================================================`);
    lines.push(`Message: ${err.message}`);
    if (err.errInfo?.failingDocumentId) {
      lines.push(`Failing Document _id: ${err.errInfo.failingDocumentId}`);
    }

    const details = err.errInfo?.details;
    if (details) {
      lines.push(`Operator: ${details.operatorName || '$jsonSchema'}`);
      if (Array.isArray(details.schemaRulesNotSatisfied) && details.schemaRulesNotSatisfied.length > 0) {
        lines.push(`Schema Rules Not Satisfied:`);
        for (let i = 0; i < details.schemaRulesNotSatisfied.length; i++) {
          const rule = details.schemaRulesNotSatisfied[i];
          if (rule.operatorName === 'required') {
            lines.push(`  [Rule ${i + 1} - required]: Missing required properties: [${rule.missingProperties?.join(', ')}]`);
            lines.push(`    Required list defined in schema: [${rule.specifiedAs?.required?.join(', ')}]`);
          } else if (rule.operatorName === 'properties') {
            lines.push(`  [Rule ${i + 1} - properties]: Constraint violations:`);
            for (const prop of rule.propertiesNotSatisfied || []) {
              lines.push(`    * Property '${prop.propertyName}': ${JSON.stringify(prop.details)}`);
            }
          } else {
            lines.push(`  [Rule ${i + 1} - ${rule.operatorName}]: ${JSON.stringify(rule)}`);
          }
        }
      }
    }
    lines.push(`================================================================================`);
    return lines.join('\n');
  }

  return err.stack || err.message || String(err);
}

/**
 * Preflight validation: checks a document against COLLECTION_VALIDATORS
 * rules before sending writes to MongoDB.
 */
export function preflightValidateSeedDocument(
  collectionName: string,
  doc: Record<string, any>
): { valid: boolean; errors: string[] } {
  const schemaDef = COLLECTION_VALIDATORS[collectionName]?.validator?.$jsonSchema;
  if (!schemaDef) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  // 1. Check required fields
  if (Array.isArray(schemaDef.required)) {
    for (const requiredProp of schemaDef.required) {
      if (doc[requiredProp] === undefined || doc[requiredProp] === null) {
        errors.push(`Missing required property '${requiredProp}' for collection '${collectionName}'`);
      }
    }
  }

  // 2. Check property constraints if present
  if (schemaDef.properties) {
    for (const [propName, propDef] of Object.entries<any>(schemaDef.properties)) {
      const val = doc[propName];
      if (val === undefined || val === null) continue;

      // Enum check
      if (Array.isArray(propDef.enum) && !propDef.enum.includes(val)) {
        errors.push(
          `Property '${propName}' value '${val}' is not in allowed enum [${propDef.enum.join(', ')}] for collection '${collectionName}'`
        );
      }

      // String pattern check
      if (propDef.pattern && typeof val === 'string') {
        const regex = new RegExp(propDef.pattern);
        if (!regex.test(val)) {
          errors.push(
            `Property '${propName}' value '${val}' does not match pattern ${propDef.pattern} for collection '${collectionName}'`
          );
        }
      }

      // Min/Max length
      if (propDef.minLength !== undefined && typeof val === 'string' && val.length < propDef.minLength) {
        errors.push(
          `Property '${propName}' string length (${val.length}) is less than minLength (${propDef.minLength})`
        );
      }
      if (propDef.maxLength !== undefined && typeof val === 'string' && val.length > propDef.maxLength) {
        errors.push(
          `Property '${propName}' string length (${val.length}) is greater than maxLength (${propDef.maxLength})`
        );
      }

      // Basic BSON type check
      if (propDef.bsonType) {
        const types = Array.isArray(propDef.bsonType) ? propDef.bsonType : [propDef.bsonType];
        let matches = false;
        for (const t of types) {
          if (t === 'string' && typeof val === 'string') matches = true;
          if (t === 'bool' && typeof val === 'boolean') matches = true;
          if (t === 'array' && Array.isArray(val)) matches = true;
          if (t === 'object' && typeof val === 'object' && !Array.isArray(val) && val !== null) matches = true;
          if ((t === 'int' || t === 'double' || t === 'long') && typeof val === 'number') matches = true;
          if (t === 'date' && (val instanceof Date || typeof val === 'string')) matches = true;
          if (t === 'null' && val === null) matches = true;
        }
        if (!matches) {
          errors.push(
            `Property '${propName}' value (${typeof val}) does not match expected bsonType [${types.join(', ')}]`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates the canonical blueprint documents for all role seed records.
 */
export function generateSeedBlueprints(): Array<{
  collection: string;
  identifier: string;
  document: Record<string, any>;
}> {
  const blueprints: Array<{
    collection: string;
    identifier: string;
    document: Record<string, any>;
  }> = [];

  const now = new Date().toISOString();

  for (const acc of DEV_ACCOUNTS) {
    const cleanEmail = acc.email.toLowerCase().trim();
    const userId = `usr_${acc.role}_dev`;
    const workspaceId = `ws_${acc.role}_dev`;
    const databaseId = `db_${acc.role}_dev`;
    const physicalNamespace = `dc_${workspaceId}_${databaseId}`;

    // 1. User document
    blueprints.push({
      collection: 'users',
      identifier: `${cleanEmail} (${userId})`,
      document: {
        id: userId,
        firebaseUid: `fb_${acc.role}_blueprint_uid`,
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        displayName: acc.displayName,
        role: acc.role,
        status: 'active',
        emailVerified: true,
        xp: acc.xp,
        level: acc.level,
        streakDays: 7,
        activeWorkspaceId: workspaceId,
        activeDatabaseId: databaseId,
        activeCollectionName: 'students',
        themePreference: acc.role === 'admin' ? 'cyber-emerald' : acc.role === 'faculty' ? 'monochrome' : 'lavender-light',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      },
    });

    // 2. Workspace document
    blueprints.push({
      collection: 'workspaces',
      identifier: `${workspaceId} (owner: ${userId})`,
      document: {
        id: workspaceId,
        userId,
        name: `${acc.displayName.split(' ')[0]}'s Workspace`,
        description: `Dedicated ${acc.role.toUpperCase()} workspace environment`,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 3. Virtual Database document
    blueprints.push({
      collection: 'virtual_databases',
      identifier: `${databaseId} (workspace: ${workspaceId})`,
      document: {
        id: databaseId,
        workspaceId,
        userId,
        name: 'CollegeDB',
        physicalDatabaseName: physicalNamespace,
        physicalNamespace,
        status: 'active',
        description: `Primary sandbox virtual database for ${acc.role}`,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 4. Faculty cohort and member
    if (acc.role === 'faculty') {
      const classroomId = 'cls_faculty_dev';
      const studentId = 'usr_student_dev';

      blueprints.push({
        collection: 'classrooms',
        identifier: `${classroomId} (code: CS-201)`,
        document: {
          id: classroomId,
          code: 'CS-201',
          name: 'Advanced Database Systems',
          description: 'Faculty-led practical cohort for relational to document data engineering',
          facultyId: userId,
          facultyName: acc.displayName,
          status: 'active',
          enrolledStudentIds: [studentId],
          createdAt: now,
          updatedAt: now,
        },
      });

      blueprints.push({
        collection: 'classroom_members',
        identifier: `${classroomId} -> ${studentId}`,
        document: {
          classroomId,
          userId: studentId,
          role: 'student',
          status: 'active',
          enrolledAt: now,
        },
      });
    }
  }

  return blueprints;
}

export async function seedDevRoles() {
  console.log('\n================================================================================');
  console.log('       DATA-CHAN — DEVELOPMENT ROLE BOOTSTRAPPER (LOCAL EMULATOR ONLY)          ');
  console.log('================================================================================\n');

  // SAFETY CHECK: Reject if production or missing emulator
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: seedDevRoles cannot and will not run in NODE_ENV=production.');
  }

  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!emulatorHost || (!emulatorHost.includes('9099') && !emulatorHost.includes('localhost'))) {
    throw new Error(
      `SECURITY VIOLATION: seedDevRoles requires a local Firebase Auth Emulator on port 9099. ` +
        `Current FIREBASE_AUTH_EMULATOR_HOST="${emulatorHost}". Refusing to run against non-emulator target.`
    );
  }

  // PREFLIGHT SCHEMA VALIDATION: Validate all document blueprints before any DB writes
  console.log('[Preflight] Validating seed record blueprints against MongoDB collection validators...');
  const blueprints = generateSeedBlueprints();
  const preflightErrors: string[] = [];

  for (const item of blueprints) {
    const res = preflightValidateSeedDocument(item.collection, item.document);
    if (!res.valid) {
      preflightErrors.push(...res.errors.map((e) => `[${item.collection} / ${item.identifier}] ${e}`));
    }
  }

  if (preflightErrors.length > 0) {
    console.error('\n✗ PREFLIGHT VALIDATION FAILED — Seed aborted before any writes:');
    for (const err of preflightErrors) {
      console.error(`  - ${err}`);
    }
    throw new Error(`Preflight validation failed for ${preflightErrors.length} schema constraints.`);
  }
  console.log(`✓ Preflight schema validation passed (${blueprints.length} blueprints verified)\n`);

  // Ensure Firebase Admin is initialized targeting local emulator
  initFirebaseAdmin();
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase Admin SDK failed to initialize with local Auth Emulator.');
  }

  const auth = getFirebaseAuth();
  await connectMongo();
  const db = getPlatformDb();

  const auditLedger: SeedAuditItem[] = [];
  const seededResults: Array<{
    role: string;
    email: string;
    password: string;
    displayName: string;
    userId: string;
    firebaseUid: string;
  }> = [];

  try {
    for (const acc of DEV_ACCOUNTS) {
      const cleanEmail = acc.email.toLowerCase().trim();
      let firebaseUid: string;

      // 1. Firebase Auth Emulator: idempotent create or update
      try {
        const existingFbUser = await auth.getUserByEmail(cleanEmail);
        firebaseUid = existingFbUser.uid;
        await auth.updateUser(firebaseUid, {
          password: acc.password,
          displayName: acc.displayName,
          emailVerified: true,
        });
        logger.info(`[Auth Emulator] Reused existing user for ${cleanEmail} (UID: ${firebaseUid})`);
        auditLedger.push({
          entity: 'Firebase User',
          identifier: cleanEmail,
          action: 'reused',
          details: `UID: ${firebaseUid}`,
        });
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          const newFbUser = await auth.createUser({
            email: cleanEmail,
            password: acc.password,
            displayName: acc.displayName,
            emailVerified: true,
          });
          firebaseUid = newFbUser.uid;
          logger.info(`[Auth Emulator] Created new test user for ${cleanEmail} (UID: ${firebaseUid})`);
          auditLedger.push({
            entity: 'Firebase User',
            identifier: cleanEmail,
            action: 'created',
            details: `UID: ${firebaseUid}`,
          });
        } else {
          auditLedger.push({
            entity: 'Firebase User',
            identifier: cleanEmail,
            action: 'failed',
            details: err.message,
          });
          throw err;
        }
      }

      // Set custom claims for role (idempotent)
      await auth.setCustomUserClaims(firebaseUid, { role: acc.role });

      // 2. MongoDB Record: idempotent create or update
      const existingMongoUser = await db.collection('users').findOne({
        $or: [{ email: cleanEmail }, { firebaseUid }],
      });

      const now = new Date().toISOString();
      let userId: string;
      let workspaceId: string;
      let databaseId: string;

      if (existingMongoUser) {
        userId = existingMongoUser.id;
        workspaceId = existingMongoUser.activeWorkspaceId || `ws_${acc.role}_dev`;
        databaseId = existingMongoUser.activeDatabaseId || `db_${acc.role}_dev`;

        await db.collection('users').updateOne(
          { _id: existingMongoUser._id },
          {
            $set: {
              role: acc.role,
              status: 'active',
              emailVerified: true,
              firebaseUid,
              displayName: acc.displayName,
              activeWorkspaceId: workspaceId,
              activeDatabaseId: databaseId,
              activeCollectionName: 'students',
              updatedAt: now,
              lastLoginAt: now,
            },
          }
        );
        logger.info(`[MongoDB] Updated existing user ${cleanEmail} -> role: ${acc.role}`);
        auditLedger.push({
          entity: 'Mongo User',
          identifier: `${cleanEmail} (${userId})`,
          action: 'updated',
          details: `Role: ${acc.role}`,
        });
      } else {
        userId = `usr_${acc.role}_dev`;
        workspaceId = `ws_${acc.role}_dev`;
        databaseId = `db_${acc.role}_dev`;

        const newUserDoc = {
          id: userId,
          firebaseUid,
          email: cleanEmail,
          username: cleanEmail.split('@')[0],
          displayName: acc.displayName,
          role: acc.role,
          status: 'active',
          emailVerified: true,
          xp: acc.xp,
          level: acc.level,
          streakDays: 7,
          activeWorkspaceId: workspaceId,
          activeDatabaseId: databaseId,
          activeCollectionName: 'students',
          themePreference: acc.role === 'admin' ? 'cyber-emerald' : acc.role === 'faculty' ? 'monochrome' : 'lavender-light',
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };

        await db.collection('users').insertOne(newUserDoc as any);
        logger.info(`[MongoDB] Inserted new user ${cleanEmail} (ID: ${userId}) -> role: ${acc.role}`);
        auditLedger.push({
          entity: 'Mongo User',
          identifier: `${cleanEmail} (${userId})`,
          action: 'created',
          details: `Role: ${acc.role}`,
        });
      }

      // 3. Ensure User has an active Workspace
      const existingWs = await db.collection('workspaces').findOne({ id: workspaceId });
      if (!existingWs) {
        await db.collection('workspaces').insertOne({
          id: workspaceId,
          userId,
          name: `${acc.displayName.split(' ')[0]}'s Workspace`,
          description: `Dedicated ${acc.role.toUpperCase()} workspace environment`,
          createdAt: now,
          updatedAt: now,
          databasesCount: 1,
        } as any);
        logger.info(`[MongoDB] Inserted workspace ${workspaceId} for ${cleanEmail}`);
        auditLedger.push({
          entity: 'Workspace',
          identifier: workspaceId,
          action: 'created',
        });
      } else {
        logger.info(`[MongoDB] Workspace ${workspaceId} exists (reused)`);
        auditLedger.push({
          entity: 'Workspace',
          identifier: workspaceId,
          action: 'reused',
        });
      }

      // 4. Ensure User has an active Virtual Database with starter data
      const existingVdb = await db.collection('virtual_databases').findOne({ id: databaseId });
      const physicalNamespace = `dc_${workspaceId}_${databaseId}`;

      if (!existingVdb) {
        await db.collection('virtual_databases').insertOne({
          id: databaseId,
          workspaceId,
          userId,
          name: 'CollegeDB',
          physicalDatabaseName: physicalNamespace,
          physicalNamespace,
          status: 'active',
          description: `Primary sandbox virtual database for ${acc.role}`,
          createdAt: now,
          updatedAt: now,
        } as any);
        logger.info(`[MongoDB] Inserted virtual database ${databaseId} for ${cleanEmail}`);
        auditLedger.push({
          entity: 'Virtual Database',
          identifier: databaseId,
          action: 'created',
          details: `Namespace: ${physicalNamespace}`,
        });

        // Seed 'students' collection in user's isolated physical namespace
        try {
          const userDb = getNamespaceDb(physicalNamespace);
          const count = await userDb.collection('students').countDocuments();
          if (count === 0) {
            await userDb.collection('students').insertMany([
              {
                studentId: 'STU-101',
                name: 'Alice Johnson',
                age: 20,
                major: 'Computer Science',
                gpa: 3.85,
                enrolledCourses: ['CS101', 'CS204'],
                status: 'active',
              },
              {
                studentId: 'STU-102',
                name: 'Bob Smith',
                age: 22,
                major: 'Electrical Engineering',
                gpa: 3.42,
                enrolledCourses: ['EE101'],
                status: 'active',
              },
              {
                studentId: 'STU-103',
                name: 'Carol White',
                age: 19,
                major: 'Computer Science',
                gpa: 3.92,
                enrolledCourses: ['CS101', 'MATH101'],
                status: 'active',
              },
            ]);
            logger.info(`[MongoDB] Seeded starter students in ${physicalNamespace}.students`);
            auditLedger.push({
              entity: 'Sandbox Collection',
              identifier: `${physicalNamespace}.students`,
              action: 'created',
              details: '3 starter student records',
            });
          } else {
            auditLedger.push({
              entity: 'Sandbox Collection',
              identifier: `${physicalNamespace}.students`,
              action: 'reused',
              details: `${count} existing documents`,
            });
          }
        } catch (err: any) {
          logger.warn(`Could not seed CollegeDB collection: ${err.message}`);
        }
      } else {
        logger.info(`[MongoDB] Virtual database ${databaseId} exists (reused)`);
        auditLedger.push({
          entity: 'Virtual Database',
          identifier: databaseId,
          action: 'reused',
          details: `Namespace: ${physicalNamespace}`,
        });
      }

      // 5. If faculty, ensure teaching classroom cohort is linked
      if (acc.role === 'faculty') {
        const existingClassroom = await db.collection('classrooms').findOne({ facultyId: userId });
        const classroomId = existingClassroom ? existingClassroom.id : 'cls_faculty_dev';

        if (!existingClassroom) {
          const student = await db.collection('users').findOne({ email: 'student@datachan.test' });
          const enrolledStudentIds = student ? [student.id] : [];

          await db.collection('classrooms').insertOne({
            id: classroomId,
            code: 'CS-201',
            name: 'Advanced Database Systems',
            description: 'Faculty-led practical cohort for relational to document data engineering',
            facultyId: userId,
            facultyName: acc.displayName,
            status: 'active',
            enrolledStudentIds,
            createdAt: now,
            updatedAt: now,
          } as any);

          if (student) {
            await db.collection('classroom_members').updateOne(
              { classroomId, userId: student.id },
              {
                $setOnInsert: {
                  classroomId,
                  userId: student.id,
                  role: 'student',
                  status: 'active',
                  enrolledAt: now,
                },
              },
              { upsert: true }
            );
          }
          logger.info(`[MongoDB] Seeded faculty classroom cohort CS-201 for ${cleanEmail}`);
          auditLedger.push({
            entity: 'Classroom',
            identifier: `${classroomId} (CS-201)`,
            action: 'created',
            details: `Faculty: ${acc.displayName}`,
          });
          if (student) {
            auditLedger.push({
              entity: 'Classroom Member',
              identifier: `${classroomId} -> ${student.id}`,
              action: 'created',
              details: 'Enrolled student@datachan.test',
            });
          }
        } else {
          logger.info(`[MongoDB] Classroom cohort ${existingClassroom.id} exists (reused)`);
          auditLedger.push({
            entity: 'Classroom',
            identifier: existingClassroom.id,
            action: 'reused',
            details: `Code: ${existingClassroom.code}`,
          });
        }
      }

      seededResults.push({
        role: acc.role,
        email: cleanEmail,
        password: acc.password,
        displayName: acc.displayName,
        userId,
        firebaseUid,
      });
    }

    // 6. Print audit ledger & summary
    console.log('\n--- Seed Execution Audit Ledger ---');
    for (const item of auditLedger) {
      const actionBadge = `[${item.action.toUpperCase()}]`.padEnd(11);
      const entityCol = item.entity.padEnd(20);
      const idCol = item.identifier.padEnd(35);
      const detailCol = item.details ? `(${item.details})` : '';
      console.log(`  ${actionBadge} ${entityCol} ${idCol} ${detailCol}`);
    }

    console.log('\n+------------+-------------------------+-------------+-------------------------------+');
    console.log('| Role       | Email                   | Password    | Display Name                  |');
    console.log('+------------+-------------------------+-------------+-------------------------------+');
    for (const r of seededResults) {
      const roleCol = r.role.padEnd(10);
      const emailCol = r.email.padEnd(23);
      const passCol = r.password.padEnd(11);
      const nameCol = r.displayName.padEnd(29);
      console.log(`| ${roleCol} | ${emailCol} | ${passCol} | ${nameCol} |`);
    }
    console.log('+------------+-------------------------+-------------+-------------------------------+\n');
    console.log('✓ All development test accounts are ready for login in the local environment.\n');

    return seededResults;
  } catch (err: any) {
    console.error('\n' + formatMongoValidationError(err));
    console.error('\nSeed Execution Audit Ledger (Partial Progress Before Failure):');
    for (const item of auditLedger) {
      const actionBadge = `[${item.action.toUpperCase()}]`.padEnd(11);
      console.error(`  ${actionBadge} ${item.entity}: ${item.identifier}${item.details ? ` (${item.details})` : ''}`);
    }
    throw err;
  }
}

// Execute directly if run as a CLI script
if (require.main === module || (process.argv[1] && process.argv[1].includes('seedDevRoles'))) {
  seedDevRoles()
    .then(async () => {
      await closeMongo();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\nSeed failed:', err.message);
      await closeMongo();
      process.exit(1);
    });
}

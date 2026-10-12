import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COLLECTION_VALIDATORS } from '../src/database/schema/validators';
import {
  formatMongoValidationError,
  preflightValidateSeedDocument,
  generateSeedBlueprints,
} from '../src/scripts/seedDevRoles';

describe('Development Role Seed Schema Validation & Error Formatting', () => {
  describe('1. Reproduction of Seed Failure (Missing status in virtual_databases)', () => {
    it('demonstrates that the original seed document fails the virtual_databases validator schema', () => {
      const originalFailingDoc = {
        id: 'db_student_dev',
        workspaceId: 'ws_student_dev',
        userId: 'usr_student_dev',
        name: 'CollegeDB',
        physicalNamespace: 'dc_ws_student_dev_db_student_dev',
        description: 'Primary sandbox virtual database for student',
        createdAt: '2026-10-02T10:31:55.647Z',
        updatedAt: '2026-10-02T10:31:55.647Z',
      };

      const vdbValidator = COLLECTION_VALIDATORS.virtual_databases.validator.$jsonSchema;
      const requiredFields: string[] = vdbValidator.required;

      // 1. Verify that 'status' is indeed in the validator's required list
      expect(requiredFields).toContain('status');

      // 2. Verify that original failing document is missing 'status'
      expect('status' in originalFailingDoc).toBe(false);

      // 3. Preflight check must fail for this document
      const preflightResult = preflightValidateSeedDocument('virtual_databases', originalFailingDoc);
      expect(preflightResult.valid).toBe(false);
      expect(preflightResult.errors).toContain(
        "Missing required property 'status' for collection 'virtual_databases'"
      );
    });

    it('formats raw MongoDB Code 121 errors into actionable details with schemaRulesNotSatisfied', () => {
      const rawMongo121Error = {
        name: 'MongoServerError',
        message: 'Document failed validation',
        code: 121,
        errInfo: {
          failingDocumentId: '6abf8ab828cde08c61c98e58',
          details: {
            operatorName: '$jsonSchema',
            schemaRulesNotSatisfied: [
              {
                operatorName: 'required',
                specifiedAs: {
                  required: [
                    'id',
                    'workspaceId',
                    'userId',
                    'name',
                    'status',
                    'createdAt',
                    'updatedAt',
                  ],
                },
                missingProperties: ['status'],
              },
            ],
          },
        },
      };

      const formatted = formatMongoValidationError(rawMongo121Error);

      expect(formatted).toContain('MongoDB Document Validation Failure (Code 121)');
      expect(formatted).toContain('Missing required properties: [status]');
      expect(formatted).toContain('id, workspaceId, userId, name, status, createdAt, updatedAt');
    });
  });

  describe('2. Corrected Seed Data Schema Verification', () => {
    it('verifies that all corrected role blueprints satisfy COLLECTION_VALIDATORS', () => {
      const blueprints = generateSeedBlueprints();

      expect(blueprints.length).toBeGreaterThan(0);

      for (const item of blueprints) {
        const result = preflightValidateSeedDocument(item.collection, item.document);
        expect(
          result.valid,
          `Document for ${item.collection} (${item.identifier}) failed validation: ${result.errors.join(', ')}`
        ).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('verifies virtual_databases blueprint includes status="active" and physicalDatabaseName', () => {
      const blueprints = generateSeedBlueprints();
      const vdbBlueprints = blueprints.filter((b) => b.collection === 'virtual_databases');

      expect(vdbBlueprints).toHaveLength(3); // student, faculty, admin

      for (const vdb of vdbBlueprints) {
        expect(vdb.document.status).toBe('active');
        expect(vdb.document.physicalDatabaseName).toBeDefined();
        expect(vdb.document.physicalNamespace).toBeDefined();
        expect(vdb.document.id).toMatch(/^db_(student|faculty|admin)_dev$/);
        expect(vdb.document.workspaceId).toMatch(/^ws_(student|faculty|admin)_dev$/);
      }
    });

    it('verifies classrooms blueprint satisfies classrooms validator', () => {
      const blueprints = generateSeedBlueprints();
      const classroomBlueprints = blueprints.filter((b) => b.collection === 'classrooms');

      expect(classroomBlueprints).toHaveLength(1);
      const cls = classroomBlueprints[0].document;

      expect(cls.id).toBe('cls_faculty_dev');
      expect(cls.code).toBe('CS-201');
      expect(cls.facultyId).toBe('usr_faculty_dev');
      expect(cls.facultyName).toBe('Prof. Marcus Vance (Faculty)');
      expect(cls.status).toBe('active');
      expect(Array.isArray(cls.enrolledStudentIds)).toBe(true);
    });

    it('verifies classroom_members blueprint satisfies classroom_members validator', () => {
      const blueprints = generateSeedBlueprints();
      const memberBlueprints = blueprints.filter((b) => b.collection === 'classroom_members');

      expect(memberBlueprints).toHaveLength(1);
      const member = memberBlueprints[0].document;

      expect(member.classroomId).toBe('cls_faculty_dev');
      expect(member.userId).toBe('usr_student_dev');
      expect(member.role).toBe('student');
      expect(member.status).toBe('active');
      expect(member.enrolledAt).toBeDefined();
    });
  });

  describe('3. Preflight Validator Rejection Rules', () => {
    it('detects invalid enum values during preflight', () => {
      const invalidUser = {
        id: 'usr_bad_dev',
        firebaseUid: 'fb_bad',
        email: 'bad@datachan.test',
        role: 'superman', // invalid role enum
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = preflightValidateSeedDocument('users', invalidUser);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('role') && e.includes('superman'))).toBe(true);
    });

    it('detects missing required fields during preflight', () => {
      const incompleteWorkspace = {
        id: 'ws_bad_dev',
        // missing userId
        name: 'Workspace without user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = preflightValidateSeedDocument('workspaces', incompleteWorkspace);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('userId'))).toBe(true);
    });

    it('validates photoUrl behavior: optional valid string passes, missing passes, explicit null or number fails', () => {
      const baseUser = {
        id: 'usr_photo_test',
        firebaseUid: 'fb_photo_test',
        email: 'phototest@datachan.test',
        role: 'student',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Omitted photoUrl should pass (optional)
      const resOmitted = preflightValidateSeedDocument('users', { ...baseUser });
      expect(resOmitted.valid).toBe(true);

      // 2. Valid string photoUrl should pass
      const resString = preflightValidateSeedDocument('users', {
        ...baseUser,
        photoUrl: 'https://cdn.datachan.org/photos/avatar.png',
      });
      expect(resString.valid).toBe(true);

      // 3. Explicit null photoUrl should fail (bsonType is 'string', null not permitted)
      const resNull = preflightValidateSeedDocument('users', {
        ...baseUser,
        photoUrl: null,
      });
      expect(resNull.valid).toBe(false);
      expect(resNull.errors.some((e) => e.includes('photoUrl') && e.includes('null'))).toBe(true);

      // 4. Non-string photoUrl should fail
      const resNumber = preflightValidateSeedDocument('users', {
        ...baseUser,
        photoUrl: 12345,
      });
      expect(resNumber.valid).toBe(false);
      expect(resNumber.errors.some((e) => e.includes('photoUrl'))).toBe(true);
    });
  });
});

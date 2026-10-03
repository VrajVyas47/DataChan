import { Collection, CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { logger } from '../../logging/logger';

export interface CanonicalIndexDef {
  key: IndexSpecification;
  options?: CreateIndexesOptions;
  description: string;
}

export const CANONICAL_INDEXES: Record<string, CanonicalIndexDef[]> = {
  users: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Fast unique lookup by user ID' },
    { key: { email: 1 }, options: { unique: true, name: 'email_1' }, description: 'Strict email uniqueness for application accounts' },
    { key: { firebaseUid: 1 }, options: { unique: true, sparse: true, name: 'firebaseUid_1' }, description: 'Unique mapping between Firebase Auth and platform user' },
    { key: { role: 1 }, options: { name: 'role_1' }, description: 'Filtering and counting by RBAC role' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Account lifecycle filtering' },
  ],

  workspaces: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Unique workspace ID lookup' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'User workspace listing and ownership validation' },
  ],

  virtual_databases: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Unique virtual database lookup' },
    { key: { workspaceId: 1, name: 1 }, options: { unique: true, name: 'workspaceId_1_name_1' }, description: 'Scoped uniqueness of DB name per workspace' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'User virtual database isolation and ownership queries' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Filtering active vs archived sandbox databases' },
    { key: { physicalDatabaseName: 1 }, options: { unique: true, sparse: true, name: 'physicalDatabaseName_1' }, description: 'Physical sandbox database isolation' },
  ],

  classrooms: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Unique classroom cohort lookup' },
    { key: { code: 1 }, options: { unique: true, name: 'code_1' }, description: 'Unique enrollment code for joining cohorts' },
    { key: { facultyId: 1 }, options: { name: 'facultyId_1' }, description: 'Faculty cohort management queries' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Filtering active cohorts' },
    { key: { enrolledStudentIds: 1 }, options: { name: 'enrolledStudentIds_1' }, description: 'Backwards-compatible membership queries' },
  ],

  classroom_members: [
    { key: { classroomId: 1, userId: 1 }, options: { unique: true, name: 'classroomId_1_userId_1' }, description: 'Prevent duplicate enrollment in same classroom' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'Student classroom enrollment listing' },
    { key: { classroomId: 1 }, options: { name: 'classroomId_1' }, description: 'Classroom roster queries' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Active vs removed enrollment filtering' },
  ],

  cohort_assignments: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical assignment ID lookup' },
    { key: { classroomId: 1, targetId: 1 }, options: { unique: true, partialFilterExpression: { status: 'active' }, name: 'uniq_active_cohort_target' }, description: 'Prevent duplicate active assignments for same target in cohort' },
    { key: { classroomId: 1, status: 1 }, options: { name: 'classroomId_1_status_1' }, description: 'List assignments per cohort by status' },
    { key: { targetId: 1 }, options: { name: 'targetId_1' }, description: 'Lookup assignments by target' },
  ],

  practicals: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical practical ID lookup' },
    { key: { number: 1 }, options: { unique: true, name: 'number_1' }, description: 'Enforce unique sequential curriculum practical number' },
    { key: { category: 1 }, options: { name: 'category_1' }, description: 'Category filtering' },
    { key: { published: 1 }, options: { name: 'published_1' }, description: 'Published practical count and listing' },
  ],

  courses: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical course ID lookup' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Published vs draft course filtering' },
    { key: { order: 1 }, options: { name: 'order_1' }, description: 'Course ordering' },
  ],

  modules: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical module ID lookup' },
    { key: { courseId: 1, order: 1 }, options: { name: 'courseId_1_order_1' }, description: 'Module sequence per course' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Module published filtering' },
  ],

  lessons: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical lesson ID lookup' },
    { key: { moduleId: 1, order: 1 }, options: { name: 'moduleId_1_order_1' }, description: 'Lesson sequence per module' },
    { key: { order: 1 }, options: { name: 'order_1' }, description: 'Sequential lesson ordering' },
    { key: { practicalId: 1 }, options: { sparse: true, name: 'practicalId_1' }, description: 'Relationship to practical' },
    { key: { category: 1 }, options: { name: 'category_1' }, description: 'Category filtering' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Published lesson filtering' },
  ],

  lesson_sections: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical section ID lookup' },
    { key: { lessonId: 1, order: 1 }, options: { name: 'lessonId_1_order_1' }, description: 'Section sequence in lesson' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Section published filtering' },
  ],

  learning_progress: [
    { key: { userId: 1, lessonId: 1 }, options: { sparse: true, name: 'userId_1_lessonId_1' }, description: 'Progress record per student lesson' },
    { key: { userId: 1, practicalId: 1 }, options: { unique: true, sparse: true, name: 'userId_1_practicalId_1' }, description: 'Strict progress record per student practical' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'Student learning dashboard queries' },
    { key: { practicalId: 1 }, options: { name: 'practicalId_1' }, description: 'Practical aggregate stats' },
    { key: { lessonId: 1 }, options: { name: 'lessonId_1' }, description: 'Lesson aggregate stats' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Filtering completed practicals' },
  ],

  challenges: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical challenge lookup' },
    { key: { difficulty: 1 }, options: { name: 'difficulty_1' }, description: 'Difficulty filtering' },
    { key: { published: 1 }, options: { name: 'published_1' }, description: 'Published challenge listing' },
  ],

  challenge_attempts: [
    { key: { userId: 1, challengeId: 1 }, options: { name: 'userId_1_challengeId_1' }, description: 'User submissions per challenge' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'User total solved challenges count' },
    { key: { challengeId: 1 }, options: { name: 'challengeId_1' }, description: 'Challenge pass rate analytics' },
    { key: { passed: 1 }, options: { name: 'passed_1' }, description: 'Filter successful attempts' },
    { key: { createdAt: -1 }, options: { name: 'createdAt_-1' }, description: 'Recent attempt ordering' },
  ],

  query_history: [
    { key: { userId: 1, createdAt: -1 }, options: { name: 'userId_1_createdAt_-1' }, description: 'Recent query history for student' },
    { key: { userId: 1, executedAt: -1 }, options: { name: 'userId_1_executedAt_-1' }, description: 'Legacy query history ordering' },
    { key: { databaseId: 1 }, options: { name: 'databaseId_1' }, description: 'Queries executed on virtual DB' },
    { key: { createdAt: -1 }, options: { name: 'createdAt_-1' }, description: 'Platform telemetry query timeline' },
    { key: { status: 1 }, options: { name: 'status_1' }, description: 'Execution status filtering' },
  ],

  data_models: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Canonical data model lookup' },
    { key: { userId: 1, workspaceId: 1 }, options: { name: 'userId_1_workspaceId_1' }, description: 'Data models owned by user in workspace' },
    { key: { userId: 1, databaseId: 1 }, options: { name: 'userId_1_databaseId_1' }, description: 'Legacy model lookup' },
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'All models owned by user' },
  ],

  forum_posts: [
    { key: { id: 1 }, options: { unique: true, name: 'id_1' }, description: 'Forum post ID lookup' },
    { key: { category: 1, createdAt: -1 }, options: { name: 'category_1_createdAt_-1' }, description: 'Category listing sorted by date' },
    { key: { tags: 1 }, options: { name: 'tags_1' }, description: 'Search and filter by tag' },
    { key: { authorId: 1 }, options: { name: 'authorId_1' }, description: 'List posts authored by user' },
  ],

  security_audit_logs: [
    { key: { userId: 1 }, options: { name: 'userId_1' }, description: 'Lookup security audits by user' },
    { key: { action: 1 }, options: { name: 'action_1' }, description: 'Audit lookup by security action type' },
    { key: { outcome: 1 }, options: { name: 'outcome_1' }, description: 'Filter security events by outcome' },
    { key: { createdAt: -1 }, options: { name: 'createdAt_-1' }, description: 'Chronological security log inspection' },
    { key: { timestamp: -1 }, options: { name: 'timestamp_-1' }, description: 'Legacy security timestamp lookup' },
  ],
};

/**
 * Idempotently syncs canonical indexes for a given collection.
 * 
 * Inspects existing indexes in MongoDB:
 * - If an index exists with conflicting options (e.g., non-unique vs unique),
 *   it logs the exact discrepancy, drops the conflicting index, and recreates it.
 * - If it already exists identically, it skips creation cleanly.
 * - Handles errors per-index so one issue never blocks remaining indexes.
 */
export async function syncCollectionIndexes(collection: Collection, indexDefs: CanonicalIndexDef[]): Promise<void> {
  let existingIndexes: any[] = [];
  try {
    existingIndexes = await collection.indexes();
  } catch (err: any) {
    logger.warn(`Could not read existing indexes for collection ${collection.collectionName}: ${err.message}`);
  }

  const existingByName = new Map<string, any>(existingIndexes.map((idx) => [idx.name, idx]));

  for (const def of indexDefs) {
    const requestedName = def.options?.name || Object.entries(def.key).map(([k, v]) => `${k}_${v}`).join('_');
    const existing = existingByName.get(requestedName);

    if (existing) {
      // Check for conflict in options: unique or sparse
      const existingIsUnique = !!existing.unique;
      const requestedIsUnique = !!def.options?.unique;
      const existingIsSparse = !!existing.sparse;
      const requestedIsSparse = !!def.options?.sparse;

      if (existingIsUnique !== requestedIsUnique || existingIsSparse !== requestedIsSparse) {
        logger.info(
          `Reconciling conflicting index "${requestedName}" on collection "${collection.collectionName}": ` +
          `existing={unique: ${existingIsUnique}, sparse: ${existingIsSparse}}, ` +
          `requested={unique: ${requestedIsUnique}, sparse: ${requestedIsSparse}}. Dropping and recreating...`
        );
        try {
          await collection.dropIndex(requestedName);
          existingByName.delete(requestedName);
        } catch (dropErr: any) {
          logger.warn(`Failed to drop conflicting index "${requestedName}" on "${collection.collectionName}": ${dropErr.message}`);
        }
      } else {
        // Options match; index is already in sync
        continue;
      }
    }

    try {
      await collection.createIndex(def.key, def.options);
      logger.info(`Synchronized index "${requestedName}" on collection "${collection.collectionName}" (${def.description})`);
    } catch (createErr: any) {
      // Check if error is "An existing index has the same name as the requested index"
      if (createErr.codeName === 'IndexOptionsConflict' || createErr.message?.includes('same name')) {
        logger.warn(
          `Index conflict detected on "${collection.collectionName}.${requestedName}". Dropping existing and recreating with canonical options...`
        );
        try {
          await collection.dropIndex(requestedName);
          await collection.createIndex(def.key, def.options);
          logger.info(`Successfully recreated index "${requestedName}" on "${collection.collectionName}"`);
        } catch (retryErr: any) {
          logger.error(`Failed to reconcile index "${requestedName}" on "${collection.collectionName}": ${retryErr.message}`);
        }
      } else {
        logger.error(`Error creating index "${requestedName}" on "${collection.collectionName}": ${createErr.message}`);
      }
    }
  }
}

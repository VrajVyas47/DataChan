# DATA-CHAN V1 — MongoDB Database Schema & Layer Audit

## 1. Executive Summary

This document represents the comprehensive audit of the MongoDB data layer in Data-Chan V1.
The application operates on a **MongoDB-First** paradigm split across two architectural tiers:
1. **Platform Database (`datachan_platform`)**: Stores all application metadata, RBAC profiles, workspace hierarchies, curriculum practicals, learning progress, challenges, telemetry query history, forum discussions, and security audit logs.
2. **User Sandbox Databases (`dc_ws_<workspaceId>_db_<databaseId>`)**: Dynamically created, strictly isolated MongoDB databases. Collections and documents created by users inside their sandboxes are user-defined and unconstrained by the fixed platform schema, but MQL execution itself is strictly controlled, parsed via AST, bounded by execution timeouts (`MAX_QUERY_EXECUTION_MS`), result limits (`MAX_RESULT_DOCUMENTS`), document size limits (`MAX_DOCUMENT_SIZE_BYTES`), and whitelisted operators without risking platform metadata corruption.

Prior to this audit, schema initialization, index definitions, and data contracts had accumulated technical debt:
- Swallowed index conflict warnings during startup caused subsequent indexes (including security audit logs and query history) to be skipped.
- Curriculum practicals and counts were split between hardcoded in-memory arrays and ad-hoc database queries.
- Classroom enrollments used an unbounded array (`enrolledStudentIds`) on classroom documents rather than a normalized membership collection.
- Student progress used an unindexed, unconstrained collection (`lesson_progress`).

This audit establishes **ONE canonical data model**, eliminates duplicate index warnings through idempotent index synchronization, and validates schema integrity across all 14 canonical collections.

---

## 2. Collection Inventory & Classification

Across the backend codebase (`apps/api/src/`), frontend client (`apps/web/src/`), and active local MongoDB instance (`mongodb://localhost:27017`), all discovered collections were inspected and classified:

| Collection Name | Discovery Location | Status in DB | Classification | Architectural Purpose & Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `authController`, `userRoutes`, `seedDevRoles` | 21 documents | **CANONICAL** | Authoritative user profiles linked 1:1 with Firebase Authentication UIDs. Role and status fields enforced via `$jsonSchema`. |
| **`workspaces`** | `workspaceController`, `databaseController` | 19 documents | **CANONICAL** | User-owned logical workspace boundaries. Enforces ownership (`userId = authenticatedUser`). |
| **`virtual_databases`** | `databaseController`, `playgroundController` | 19 documents | **CANONICAL** | Virtual database catalog mapping logical names to isolated physical sandbox databases (`physicalDatabaseName`). |
| **`classrooms`** | `classroomController`, `seedDevRoles` | 3 documents | **CANONICAL** | Faculty cohorts. Enforces unique cohort join code (`code`) and faculty ownership (`facultyId`). |
| **`classroom_members`** | Added in canonical schema layer | 0 docs (backfilled) | **CANONICAL** | Normalized many-to-many junction between classrooms and enrolled students. Enforces unique compound index `(classroomId, userId)`. |
| **`practicals`** | Added in canonical schema layer | 15 documents | **CANONICAL** | Official V1 MongoDB curriculum definitions. Unique sequential `number`, XP rewards, difficulty, and published status. |
| **`lessons`** | `curriculumSeed`, `learningController` | 15 documents | **CANONICAL** | Interactive learning content, markdown concepts, practice queries, linked via `practicalId`. |
| **`learning_progress`**| Added in canonical schema layer | 2 documents | **CANONICAL** | Canonical progress tracking per student practical. Enforces unique compound index `(userId, practicalId)`. |
| **`lesson_progress`** | `learningController` | 1 document | **LEGACY / MIGRATED** | Pre-canonical progress collection. Retained with automatic bidirectional backfilling to prevent breaking legacy client queries. |
| **`challenges`** | `challengeSeed`, `challengeController` | 3 documents | **CANONICAL** | Official MQL and schema design challenges stored in MongoDB. |
| **`challenge_attempts`**| `challengeController`, `classroomController`| 1 document | **CANONICAL** | Student challenge submissions, scores, execution durations, and test feedback. |
| **`query_history`** | `playgroundController`, `learningController`| 16 documents | **CANONICAL** | Real query telemetry records. Powers platform telemetry without fabricated metrics. |
| **`data_models`** | `dataModelController` | 1 document | **CANONICAL** | Persisted React Flow data model diagrams, entity nodes, and relationship edges. |
| **`forum_posts`** | `forumService`, `forumController` | 5 documents | **CANONICAL** | Peer-to-peer discussion threads, code snippets, tags, upvotes, and threaded replies. |
| **`security_audit_logs`**| `audit.ts`, `authController` | 29 documents | **CANONICAL** | Immutable security events, login sessions, role mutations, CSRF violations, and IP addresses. |

---

## 3. Investigation: Duplicate Index Warning Root Cause

### 3.1 The Problem
During development server boot, the following warning repeatedly appeared in API logs:
```
MongoServerError: An existing index has the same name as the requested index: firebaseUid_1 with different options: { key: { firebaseUid: 1 }, name: "firebaseUid_1", sparse: true } vs { key: { firebaseUid: 1 }, name: "firebaseUid_1", unique: true, sparse: true }
```

### 3.2 Root Cause Analysis
1. In an earlier iteration of the database schema, an index named `firebaseUid_1` was created on the `users` collection with the option `{ sparse: true }`, but **without** `{ unique: true }`.
2. When the redesigned authentication layer added:
   ```typescript
   await db.collection('users').createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });
   ```
   MongoDB rejected the command because index names are immutable once created with specific options.
3. Crucially, in `apps/api/src/database/schema.ts`, index creation was wrapped in a single monolithic `try/catch` block. When line 71 threw the `IndexOptionsConflict` error, execution jumped directly to the outer catch block.
4. **Impact**: Because execution halted on line 71, all subsequent indexes in `apps/api/src/database/schema.ts` were silently skipped! Specifically:
   - `users.role_1` and `users.status_1`
   - All indexes on `security_audit_logs` (`timestamp`, `userId`, `action`)
   - All indexes on `query_history` (`userId`, `executedAt`, `databaseId`)
   - All indexes on `data_models` and `challenge_attempts`

### 3.3 The Solution: Idempotent Index Synchronizer
We implemented `syncCollectionIndexes` in `apps/api/src/database/schema/indexes.ts`:
1. Inspects the collection's actual live index catalog using `collection.indexes()`.
2. Checks whether an existing index has conflicting options (`unique` or `sparse` mismatch).
3. If an option conflict exists, it logs the exact discrepancy, drops the obsolete index via `dropIndex(requestedName)`, and recreates it with canonical options.
4. If options match identically, it skips creation entirely, eliminating index thrashing and log noise.
5. Index creation is isolated per definition: an unexpected error on one index never prevents remaining collections and indexes from being initialized.

---

## 4. Reconciliation Strategy & Backward Compatibility

### 4.1 Classrooms: Unbounded Array vs `classroom_members`
- **Issue**: Previously, `classrooms` stored `enrolledStudentIds: string[]`. As cohorts grow, unbounded arrays inside document models introduce document growth overhead and risk hitting the 16MB BSON cap.
- **Reconciliation**:
  - Introduced `classroom_members` with a unique compound index on `(classroomId, userId)`.
  - Updated `classroomController.ts` so student enrollment writes directly to `classroom_members`.
  - Maintained `enrolledStudentIds` on `classrooms` as a projection cache so existing frontend components require zero breaking changes.
  - Added automatic backfilling in `initializePlatformSchema` so existing classroom students are seamlessly enrolled into `classroom_members`.

### 4.2 Learning Progress: `lesson_progress` vs `learning_progress`
- **Issue**: `lesson_progress` lacked validation, unique compound constraints, and practical score tracking.
- **Audit Findings**:
  - `learning_progress` is the canonical schema collection with `$jsonSchema` validation and compound unique index `(userId, practicalId)`.
  - Active runtime API controllers (`learningController.ts` and `authController.ts`) still read and write directly to `lesson_progress`.
  - `initializePlatformSchema.ts` automatically backfills data from `lesson_progress` into `learning_progress` on boot.
  - `seedDevData.ts` seeds development progress records into both `learning_progress` (`practical_01` completed, `practical_02` in progress) and `lesson_progress` (`lesson-1-mongodb-basics` completed).
- **Reset & Re-Seeding Policy**:
  - `resetDevData.ts` purges `lesson_progress` during development reset to remove stale/orphan test records from prior manual sessions.
  - `seedDevData.ts` immediately recreates the required baseline progress record for `student@datachan.test` (`usr_student_dev`), ensuring zero downtime or broken telemetry for the development baseline.
- **Migration Roadmap**:
  - An upcoming release will switch `learningController.ts` and `authController.ts` to query `learning_progress` with fallback to `lesson_progress`, enabling permanent retirement of the legacy collection.

### 4.3 Virtual Databases: Status and Physical Namespaces
- **Issue**: Some early development records lacked the `status` field.
- **Reconciliation**:
  - `initializePlatformSchema` automatically sets `status: 'active'` on any legacy `virtual_databases` records where `status` was undefined.
  - Enforced that physical database namespaces follow the isolated naming rule `dc_ws_<workspaceId>_db_<databaseId>`, never allowing user-controlled raw names.

---

## 5. User Sandbox Database Isolation Audit

A search across the local MongoDB instance discovered 19 user sandbox databases:
```
dc_ws_ws_admin_dev_db_vdb_admin_dev
dc_ws_ws_faculty_dev_db_vdb_faculty_dev
dc_ws_ws_student_dev_db_vdb_student_dev
...
```
### Security Boundary Verification:
1. **Namespace Generation**: The physical database name is generated exclusively server-side in `apps/api/src/modules/databases/databaseController.ts`:
   ```typescript
   const physicalNamespace = `dc_ws_${cleanWsId}_db_${cleanDbId}`;
   ```
2. **Access Control**: Every playground query verifies ownership:
   ```typescript
   const vdb = await platformDb.collection('virtual_databases').findOne({ id: databaseId });
   if (vdb.userId !== req.user.userId && req.user.role !== 'admin') {
     throw new AuthorizationError('You do not have permission to execute queries on this database');
   }
   ```
3. **Database Separation**:
   - `datachan_platform` contains zero student playground tables.
   - User sandbox databases contain zero platform administrative records.
   - Cross-database queries between student sandboxes are physically impossible as each connection targets its own distinct Mongo database handle (`client.db(vdb.physicalNamespace)`).

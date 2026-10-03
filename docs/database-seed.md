# DATA-CHAN V1 — Development Seed Data & Safe Reset Guide

## 1. Overview & Architectural Policy

In Data-Chan V1, **development seed data is strictly decoupled from production startup logic**.
The application server boot sequence (`server.ts` -> `initializePlatformSchema()`) configures schemas, `$jsonSchema` validators, and compound indexes, but **never** injects synthetic mock or seed data into production environments.

Development seed data is provisioned through explicit, idempotent developer scripts:
1. **`npm run seed:dev-roles`** (`apps/api/src/scripts/seedDevRoles.ts`): Bootstraps the local Firebase Auth Emulator test accounts and their corresponding MongoDB RBAC profiles.
2. **`npm run seed:dev-data`** (`apps/api/src/scripts/seedDevData.ts`): Populates the 15 canonical MongoDB curriculum practicals, lessons, interactive challenges, curated forum discussions, and sample telemetry records.
3. **`npm run reset:dev -- --confirm`** (`apps/api/src/scripts/resetDevData.ts`): Performs a controlled, safe purge of local platform collections and sandbox databases, followed by deterministic re-initialization.

---

## 2. Seed Data Categorization

Seed data is categorized into four distinct layers:

### Category A: Required Development Role Accounts
Created exclusively for local testing against the local Firebase Auth Emulator (`localhost:9099`):

| Role | Email | Password | Display Name | Internal User ID | Initial Workspaces / DB |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`student`** | `student@datachan.test` | `Test@12345` | Alex Rivers (Student) | `usr_student_dev` | Workspace `ws_student_dev`, Sandbox `vdb_student_dev` |
| **`faculty`** | `faculty@datachan.test` | `Test@12345` | Prof. Marcus Vance (Faculty) | `usr_faculty_dev` | Workspace `ws_faculty_dev`, Sandbox `vdb_faculty_dev`, Cohort `CS-201` |
| **`admin`** | `admin@datachan.test` | `Test@12345` | SysAdmin Data-Chan (Admin) | `usr_admin_dev` | Workspace `ws_admin_dev`, Sandbox `vdb_admin_dev` |

> [!CAUTION]
> These credentials exist solely for local offline development. They are hard-blocked from production environments, never exposed in client `NEXT_PUBLIC_*` bundles, and strictly rejected if `FIREBASE_AUTH_EMULATOR_HOST` is missing.

### Category B: Required Curriculum Seed Data
Populates the authoritative database collections for learning:
- **15 Practicals (`practicals`)**: Numbered 1 to 15, classified across Foundations, CRUD, Indexing, and Aggregation pipelines, each with explicit XP rewards (50 XP) and difficulty classifications.
- **15 Lessons (`lessons`)**: Corresponding interactive learning documents, concept markdown, example queries, starter practice queries, and practice explanations referencing `practicalId`.
- **3 Challenges (`challenges`)**: Deterministic verification challenges:
  1. `ch-find-cs-adults`: Filter query targeting adult Computer Science students.
  2. `ch-high-achievers-projection`: Projections targeting high GPA students.
  3. `ch-avg-gpa-by-department`: Aggregation pipeline computing average GPA by department.

### Category C: Optional Demonstration Data
- **Curated Forum Posts (`forum_posts`)**: 5 foundational engineering discussions covering schema embedding vs referencing, `$lookup` pipelines, indexing strategies, and community announcements.
- **Demonstration Student Progress (`learning_progress`)**: Preloads `usr_student_dev` with Practical 1 completed (100% score, 50 XP awarded) and Practical 2 in progress.
- **Demonstration Query Telemetry (`query_history`)**: Preloads realistic execution telemetry records on `vdb_student_dev` for dashboard visualization without fake fallback values.

### Category D: Test-Only Data
- Synthetic ephemeral users and records created by Vitest integration tests (e.g., `apps/api/test/security.test.ts` and `apps/api/test/databaseSchema.test.ts`). These records are isolated to memory or cleaned up post-test.

---

## 3. Safe Development Reset (`npm run reset:dev`)

### 3.1 Purpose
Provides developers with a deterministic way to clean and restore the local MongoDB environment without needing manual shell commands or risk of deleting arbitrary databases.

### 3.2 Safety Enforcements
`apps/api/src/scripts/resetDevData.ts` enforces four rigid safety barriers:
1. **Production Guard**: Throws an immediate error if `NODE_ENV === 'production'`.
2. **Remote Database Guard**: Inspects `MONGODB_URI`. If the host is not `localhost`, `127.0.0.1`, or `host.docker.internal`, it halts immediately to protect remote and hosted databases.
3. **Explicit Confirmation Required**: Running `npm run reset:dev` without `--confirm` acts as a **safe dry-run**:
   - Inspects the live MongoDB cluster on `mongodb://localhost:27017`.
   - Lists all 14 canonical collections with current live record counts scheduled for purge.
   - Lists legacy collections scheduled for purge (`lesson_progress [2 records] -> PURGED`).
   - Lists all active sandbox databases (matching prefix `dc_ws_*`) scheduled to be dropped.
   - Refuses to execute any destructive actions without `--confirm`.
4. **Strictly Scoped Deletion**:
   - Purges **only** the 14 platform collections in `datachan_platform`.
   - Purges **only** legacy `lesson_progress` within `datachan_platform` (immediately recreated with a clean development baseline during `seedDevData`).
   - Drops **only** databases starting with prefix `dc_ws_`.
   - **Strictly preserves system databases**: `admin`, `config`, `local`, Docker instances, and unrelated projects are completely untouched.

### 3.3 Execution Commands

**Dry-Run (Safe Inspection)**:
```bash
npm run reset:dev
```

**Destructive Execution (Confirmed)**:
```bash
npm run reset:dev -- --confirm
```

---

## 4. Initialization & Seed Commands Summary

| Task | Command | Description |
| :--- | :--- | :--- |
| **Initialize Schema & Indexes** | `npm run schema:init` | Configures all 14 collections, updates `$jsonSchema` validators, and idempotently syncs indexes. |
| **Seed Role Accounts** | `npm run seed:dev-roles` | Creates Firebase Auth Emulator users and MongoDB user/workspace records. |
| **Seed Curriculum & Data** | `npm run seed:dev-data` | Seeds 15 practicals, lessons, challenges, and forum discussions. |
| **Full Environment Reset** | `npm run reset:dev -- --confirm` | Safely purges platform data, drops sandboxes, and re-seeds baseline roles & curriculum. |

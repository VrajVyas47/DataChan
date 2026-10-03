# DATA-CHAN V1 — Database Ownership & Role Access Control Rules

## 1. Multi-Tenant Ownership Model

Data-Chan enforces strict multi-tenancy at the data layer.
The primary application database (`datachan_platform`) hosts shared application metadata, but every student and faculty entity is strictly bounded by ownership constraints.

### The Source of Truth Hierarchy:
1. **Firebase Authentication** is authoritative for cryptographic identity verification.
2. **MongoDB `users.role`** is authoritative for application permissions and RBAC capabilities.
3. **MongoDB document ownership fields** (`userId`, `facultyId`) are authoritative for resource access.
4. **The frontend is NEVER the source of truth** for roles, permissions, or ownership checks.

---

## 2. Role Capability & Denial Matrix

| Domain Operation | Student | Faculty | Admin | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :--- |
| **Access Student Lab & Lessons** | ALLOW | ALLOW | ALLOW | `authMiddleware` |
| **Manage Own Workspaces** | ALLOW (Own) | ALLOW (Own) | ALLOW (Own) | `workspace.userId === req.user.userId` |
| **Manage Own Virtual Databases** | ALLOW (Own) | ALLOW (Own) | ALLOW (Own) | `vdb.userId === req.user.userId` |
| **Execute MQL in Own Sandbox** | ALLOW | ALLOW | ALLOW | `vdb.userId === req.user.userId` |
| **Attempt Challenges & Track XP** | ALLOW | ALLOW | ALLOW | `authMiddleware` |
| **Create & Save Own Data Models**| ALLOW (Own) | ALLOW (Own) | ALLOW (Own) | `model.userId === req.user.userId` |
| **Participate in Forum Discussions**| ALLOW | ALLOW | ALLOW | `authMiddleware` |
| **Create Faculty Classroom** | **DENIED (403)** | ALLOW | ALLOW | `requireRole('faculty', 'admin')` |
| **View Classroom Roster** | **DENIED (403)** | ALLOW (Assigned) | ALLOW | `classroom.facultyId === req.user.userId \|\| admin` |
| **Access Admin Telemetry** | **DENIED (403)** | **DENIED (403)** | ALLOW | `requireRole('admin')` |
| **Access User Directory** | **DENIED (403)** | **DENIED (403)** | ALLOW | `requireRole('admin')` |
| **Escalate / Mutate User Roles**| **DENIED (403)** | **DENIED (403)** | ALLOW | `requireRole('admin')` + self-escalation guard |
| **Suspend / Disable User Status**| **DENIED (403)** | **DENIED (403)** | ALLOW | `requireRole('admin')` + last-admin guard |
| **Tamper with Other User's Sandbox**| **DENIED (403)** | **DENIED (403)** | **DENIED (403)** | Strict tenant isolation |

---

## 3. Strict Resource Ownership Rules

### 3.1 Workspaces (`workspaces`)
- **Rule**: Every workspace mutation (`GET`, `PUT`, `DELETE`) verifies:
  ```typescript
  if (workspace.userId !== req.user.userId) {
    throw new AuthorizationError('You do not have permission to access this workspace');
  }
  ```
- **Invariant**: Student A can never view, update, or delete Student B's workspace.

### 3.2 Virtual Databases (`virtual_databases`)
- **Rule**: Every virtual database mutation and query endpoint verifies:
  ```typescript
  if (vdb.userId !== req.user.userId && req.user.role !== 'admin') {
    throw new AuthorizationError('You do not have permission to access this virtual database');
  }
  ```
- **Physical Namespace Invariant**: The physical database name (`physicalDatabaseName`) is generated exclusively server-side using the format `dc_ws_<workspaceId>_db_<databaseId>`. Clients cannot specify arbitrary database namespaces.

### 3.3 Classrooms & Rosters (`classrooms`, `classroom_members`)
- **Creation**: Restricted to `faculty` and `admin` roles.
- **Roster Viewing**:
  ```typescript
  if (classroom.facultyId !== req.user.userId && req.user.role !== 'admin') {
    throw new AuthorizationError('Only the assigned faculty instructor or administrator can view this cohort roster');
  }
  ```
  Students enrolled in a classroom cannot view the private records, emails, or XP details of their peers.
- **Membership**: Student enrollment creates an immutable, unique record in `classroom_members` linking `(classroomId, userId)`.

### 3.4 Data Modeler Diagrams (`data_models`)
- **Rule**: Saved models belong strictly to their author (`model.userId === req.user.userId`).
- **Policy**: In Data-Chan V1, cross-user model sharing is intentionally not implemented to preserve strict student privacy and lab assessment integrity.

---

## 4. Administrative Role Boundaries

> [!IMPORTANT]
> In Data-Chan V1, "Admin" represents capability inclusion for platform maintenance, **not an unrestricted bypass of user privacy**.

1. **Self-Escalation Prohibition**: Administrators cannot change their own role or promote untrusted users without formal security audit logging.
2. **Last Active Admin Protection**: The application prevents an administrator from demoting or disabling the final active administrator account (`activeAdminsCount <= 1` check in `adminController.ts`).
3. **Sandbox Privacy**: Administrator telemetry monitors aggregate metrics (total queries, active databases, connection health) via `query_history` and server status. Administrators do not silently execute ad-hoc data mutations inside students' private sandbox databases.

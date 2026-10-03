# Architecture Specification

## 1. Domain Modeling and Isolation
Data-Chan isolates educational users at multiple structural tiers:
- **User Record**: Stored in platform database `datachan_platform.users`.
- **Workspaces**: Grouping logical projects (e.g., "Semester 4 Lab", "Practice").
- **Virtual Databases**: Logical database entities owned by a workspace.
- **Physical MongoDB Namespaces**: Each virtual database maps internally to a sanitized, isolated physical namespace:
  `dc_<workspaceId>_<databaseId>`
  This ensures:
  - Complete data isolation between users.
  - Zero risk of namespace collisions.
  - No access to MongoDB administrative commands or system databases (`admin`, `config`, `local`).

## 2. Query Pipeline & Sandboxing (Zero Eval Guarantee)
```
User MQL Input (Browser Monaco Editor)
  │
  ▼
POST /api/v1/playground/query
  │
  ▼
[1] Authentication & Bearer Token Verification
  │
  ▼
[2] Workspace & Database Ownership Verification
  │
  ▼
[3] Safe AST Parser (Acorn JavaScript AST)
    - Verifies expression is db.<col>.<op>(...)
    - Safe evaluation of literals, objects, arrays
    - STRICTLY rejects Function, Identifier, NewExpression, Window, Global
  │
  ▼
[4] Query Normalizer & Operator Whitelist Guard
    - Checks supported operation: find, insertOne, updateOne, aggregate, etc.
    - Recursively checks all operators ($gt, $match, etc.)
  │
  ▼
[5] Resource Guard (Timeout: 5000ms, Max docs: 100, Max size: 1MB)
  │
  ▼
[6] Official MongoDB Node.js Driver Execution on Namespace dc_<ws>_<db>
  │
  ▼
[7] Query Result Structuring & Syntax Breakdown Generation
  │
  ▼
[8] Asynchronous Query History Logging
  │
  ▼
Response JSON { success: true, data: { ... }, error: null }
```

## 3. Challenge Evaluation Engine
Challenges run deterministically against pre-seeded or isolated collections:
1. Student submits query.
2. Query is executed within the challenge's dataset context.
3. Actual output documents or aggregation statistics are normalized (sorting canonical keys, ignoring volatile ObjectID differences where appropriate).
4. Compared deterministically against expected outputs / test cases.
5. Emits feedback (Passed / Failed, matching metrics, detailed diff).
6. Updates student XP and level state atomically.

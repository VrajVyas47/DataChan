# Database Architecture

## 1. MongoDB as the Authoritative Store
Data-Chan uses the official MongoDB Node.js driver (`mongodb`). The architecture strictly enforces a separation between:
1. **Platform Database (`datachan_platform`)**: Stores user accounts, workspace metadata, virtual database registries, query histories, curriculum lessons, challenges, user data models, and gamification state.
2. **Virtual Sandbox Databases (`dc_<ws>_<db>`)**: Each user workspace database resides in its own isolated MongoDB database namespace.

## 2. Platform Collections Schema
- `users`: `{ id, firebaseUid, email, username, xp, level, streakDays, activeWorkspaceId, themePreference, createdAt }`
- `workspaces`: `{ id, userId, name, description, createdAt, updatedAt }`
- `virtual_databases`: `{ id, workspaceId, userId, name, physicalNamespace, createdAt, updatedAt }`
- `query_history`: `{ id, userId, workspaceId, databaseId, collection, rawQuery, operation, durationMs, documentsReturned, success, errorCode, timestamp }`
- `lessons`: `{ id, order, title, category, estimatedMinutes, xpReward, conceptMarkdown, exampleQuery, starterPracticeQuery, practiceCollection }`
- `lesson_progress`: `{ userId, lessonId, completed, completedAt }`
- `challenges`: `{ id, title, difficulty, category, xpReward, problemStatement, targetCollection, starterQuery, datasetDescription, testCases }`
- `challenge_attempts`: `{ id, userId, challengeId, query, passed, feedback, executionMs, createdAt }`
- `data_models`: `{ id, userId, name, description, entities, relationships, createdAt, updatedAt }`

## 3. Connection Pooling
A single global `MongoClient` singleton manages the connection pool across the application lifecycle. Individual repository methods access target databases dynamically via `client.db(namespace)` without opening new TCP connections per request.

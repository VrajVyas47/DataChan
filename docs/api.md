# API Specification (/api/v1)

All endpoints accept and return `application/json`.
Errors follow the standardized machine-readable envelope:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Human readable error description",
    "details": {}
  }
}
```

## 1. Authentication & User Profile
- `GET /api/v1/auth/me`: Get current authenticated user profile and stats.
- `POST /api/v1/auth/sync`: Synchronize Firebase user record into Data-Chan.
- `GET /api/v1/profile`: Retrieve detailed user profile, skills, and achievements.
- `PATCH /api/v1/profile/preferences`: Update preferences (theme, active workspace/db).

## 2. Workspaces
- `GET /api/v1/workspaces`: List workspaces owned by current user.
- `POST /api/v1/workspaces`: Create a new workspace (`{ name, description }`).
- `GET /api/v1/workspaces/:id`: Retrieve workspace details.
- `DELETE /api/v1/workspaces/:id`: Delete workspace and all its databases.

## 3. Virtual Databases
- `GET /api/v1/workspaces/:workspaceId/databases`: List virtual databases.
- `POST /api/v1/workspaces/:workspaceId/databases`: Create virtual database.
- `GET /api/v1/databases/:id`: Retrieve virtual database metadata and stats.
- `DELETE /api/v1/databases/:id`: Drop virtual database.

## 4. Collections
- `GET /api/v1/databases/:databaseId/collections`: List collections in database.
- `POST /api/v1/databases/:databaseId/collections`: Create a new collection.
- `GET /api/v1/databases/:databaseId/collections/:name`: Inspect collection (stats, detected fields).
- `DELETE /api/v1/databases/:databaseId/collections/:name`: Drop collection.

## 5. Documents (CRUD)
- `GET /api/v1/databases/:databaseId/collections/:name/documents`: Get documents (paginated, with search filter).
- `POST /api/v1/databases/:databaseId/collections/:name/documents`: Insert document (`insertOne`).
- `PUT /api/v1/databases/:databaseId/collections/:name/documents/:docId`: Replace or update document (`updateOne`).
- `DELETE /api/v1/databases/:databaseId/collections/:name/documents/:docId`: Delete document (`deleteOne`).

## 6. Playground & Query Execution
- `POST /api/v1/playground/query`: Execute raw MQL script or normalized query safely.
  ```json
  {
    "databaseId": "...",
    "collection": "students",
    "rawQuery": "db.students.find({ age: { $gt: 18 } }).sort({ age: -1 })"
  }
  ```
- `GET /api/v1/query-history`: Retrieve past query history.
- `DELETE /api/v1/query-history`: Clear query history for current user.

## 7. Learning & Curriculum
- `GET /api/v1/lessons`: List all MongoDB curriculum lessons and completion statuses.
- `GET /api/v1/lessons/:id`: Fetch specific lesson detail and practice query.
- `POST /api/v1/lessons/:id/complete`: Mark lesson completed and claim XP.

## 8. Challenges
- `GET /api/v1/challenges`: List practice challenges with difficulty and XP.
- `GET /api/v1/challenges/:id`: Fetch challenge requirements and starter query.
- `POST /api/v1/challenges/:id/attempt`: Submit student query for deterministic evaluation.

## 9. Data Modeler
- `GET /api/v1/data-models`: List user data models.
- `POST /api/v1/data-models`: Save or update a data model.
- `GET /api/v1/data-models/:id`: Retrieve data model.
- `POST /api/v1/data-models/:id/validate`: Run deterministic rule-based feedback.
- `POST /api/v1/data-models/:id/generate`: Generate MongoDB structure & apply to target database.

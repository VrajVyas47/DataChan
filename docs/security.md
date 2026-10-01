# Data-Chan Platform Security Specification

## 1. Zero Arbitrary Code Execution (Zero Eval)
Under no circumstances does the backend execute client strings via `eval()`, `Function()`, `vm`, or shell execution.
All query strings are parsed into an Abstract Syntax Tree (AST) using Acorn. Only declarative literal expressions (`ObjectExpression`, `ArrayExpression`, `Literal`, `UnaryExpression` for negative numbers) are converted into JavaScript data structures. Any invocation of functions, closures, global references, or properties outside the allowed MongoDB driver namespace triggers an immediate `INVALID_QUERY` security rejection.

## 2. Operator Whitelist
The query normalizer validates every key in user-submitted objects against a strict operator whitelist:
- **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`
- **Logical**: `$and`, `$or`, `$nor`, `$not`
- **Element**: `$exists`, `$type`
- **Evaluation**: `$regex`, `$mod` (strictly disallows `$where`)
- **Array**: `$all`, `$elemMatch`, `$size`
- **Update**: `$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`, `$push`, `$pop`, `$pull`, `$addToSet`
- **Aggregation Stages**: `$match`, `$group`, `$sort`, `$project`, `$unwind`, `$limit`, `$skip`, `$count`, `$addFields`

Disallowed operators (e.g., `$where`, `$accumulator`, `$function`, administrative commands like `$out` to arbitrary namespaces) are categorically rejected.

## 3. Sandboxing & Resource Limits
- **Execution timeout**: 5000ms max per query via MongoDB driver `maxTimeMS`.
- **Result limit**: Automatic ceiling of 100 documents per query.
- **Document size ceiling**: Max 1MB payload per insert/update.
- **Namespace isolation**: Physical MongoDB namespace segregation (`dc_<workspaceId>_<databaseId>`).
- **Internal protection**: Users can never query `admin`, `config`, `local`, or internal `system.*` collections.

## 4. Authoritative Authentication Architecture
- **Identity Provider**: Firebase Authentication is the sole identity authority. Data-Chan does not implement custom password hashing, bcrypt, or custom JWT generation.
- **Session Exchange**: Clients authenticate via Firebase Auth, obtain a short-lived Firebase ID token, and post it to `POST /api/v1/auth/session`.
- **Server Session Cookie**: The backend cryptographically verifies the ID token via Firebase Admin SDK, validates the user's account status (`active`, `suspended`, `disabled`), and issues a secure `HttpOnly`, `SameSite=Lax`, `Secure` (production) session cookie (`datachan_session`).
- **No LocalStorage Auth Tokens**: Auth tokens are never stored in browser `localStorage`.
- **Fail Closed**: Missing, malformed, expired, or revoked sessions immediately return `401 Unauthorized`.

## 5. Zero Client Trust & Purged Backdoors
- All development bypasses (`x-dev-role`, `x-dev-uid`, `x-dev-email`, and fake bearer tokens like `token_<uid>`) have been completely purged from both backend and frontend.
- Requests without valid session credentials fail closed with `401 Unauthorized`.
- Client-supplied roles and user IDs in request bodies or query parameters are never trusted.

## 6. Role-Based Access Control (RBAC) & Ownership
- **Roles**: Explicit hierarchy: `student`, `faculty`, `admin`.
- **Public Registration**: Every public/self-service sign-up strictly assigns `role = 'student'` and `status = 'active'`. Clients cannot select or promote themselves to `faculty` or `admin`.
- **Admin Promotion**: Only authenticated administrators can promote accounts to `faculty` or `admin` via `PATCH /api/v1/admin/users/:userId/role`.
- **Firebase Custom Claims Sync**: Role updates on the backend propagate to Firebase Custom Claims (`{ role: newRole }`) and invalidate obsolete tokens where appropriate.
- **Self-Demotion Protection**: Administrators cannot demote themselves, preventing accidental system lockout.
- **Resource Ownership**: Every request for workspace, database, collection, or user data checks server-side resource ownership (`resource.userId === authenticatedUser.userId`). Non-owners receive `403 Forbidden`.

## 7. Account Lifecycle & Status Enforcement
- User accounts have an explicit status field: `active`, `suspended`, `disabled`.
- Accounts with `status !== 'active'` are immediately denied access with `403 Forbidden` across all application endpoints.

## 8. Security Audit Logging
Security-critical operations are persistently logged in MongoDB `security_audit_logs`:
- Session creation (`LOGIN_SESSION_CREATED`)
- Session logout (`LOGOUT`)
- Role promotions/demotions (`ROLE_UPDATED`)
- Account status changes (`ACCOUNT_SUSPENDED`, `ACCOUNT_DISABLED`, `ACCOUNT_ACTIVATED`)
- Unauthorized/forbidden access attempts (`FORBIDDEN_ATTEMPT`)
- Administrator actions

Sensitive data (passwords, session cookie values, private keys) are never written to logs.

## 9. Network Defense: CSRF, CORS & Security Headers
- **CORS**: Explicit whitelist of allowed origins (`CORS_ALLOWED_ORIGINS`). Wildcard (`*`) is never used with `credentials: true`.
- **CSRF**: State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require trusted Origin/Referer matching the server's allowlist. Safe methods (`GET`, `HEAD`) never perform state mutations.
- **Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` in HTTPS production.
- **Rate Limiting**: Critical endpoints (`/auth/session`, `/admin/*`) are rate-limited via `express-rate-limit`.

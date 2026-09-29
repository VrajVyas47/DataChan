# Security Specification

## 1. Zero Arbitrary Code Execution (Zero Eval)
Under no circumstances does the backend execute client strings via `eval()`, `Function()`, `vm`, or shell execution.
All query strings are parsed into an Abstract Syntax Tree (AST) using Acorn. Only declarative literal expressions (ObjectExpression, ArrayExpression, Literal, UnaryExpression for negative numbers) are converted into JavaScript data structures. Any invocation of functions, closures, global references, or properties outside the allowed MongoDB driver namespace triggers an immediate `INVALID_QUERY` security rejection.

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
- Execution timeout: 5000ms max per query via MongoDB driver `maxTimeMS`.
- Result limit: Automatic ceiling of 100 documents per query.
- Document size ceiling: Max 1MB payload per insert/update.
- Namespace protection: Users can never query `admin`, `config`, `local`, or internal `system.*` collections.

## 4. Authentication & Authorization
- Client sends Firebase ID token in `Authorization: Bearer <token>` header.
- Backend verifies token signature using Firebase Admin SDK.
- The verified Firebase UID is mapped to the internal user ID.
- Every workspace and database access checks the ownership relation: `virtualDatabase.userId === currentUser.id`. Unauthorized attempts fail with `AUTHORIZATION_ERROR`.

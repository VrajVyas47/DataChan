# ADR 005: Virtual Database Physical Namespace Isolation

## Status
Accepted

## Context
Multiple students will create databases with identical user-friendly names (e.g., `CollegeDB`, `TestDB`). Storing them directly under user-provided names in MongoDB causes collision and security leakage.

## Decision
Virtual database entities in the platform metadata map to generated physical MongoDB database namespaces:
`dc_<workspaceId>_<databaseId>`
The backend validates that the requesting user owns the workspace and virtual database before routing operations to this namespace.

## Consequences
- Guaranteed multi-tenant data isolation.
- Transparent to the user, who continues seeing their friendly database names in the UI.
- Direct protection against path traversal or reserved database name hijacking.

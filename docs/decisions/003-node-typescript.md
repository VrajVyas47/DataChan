# ADR 003: Node.js and TypeScript for Authoritative Backend

## Status
Accepted

## Context
A modular REST API is required to handle authentication, domain validation, sandbox query parsing, and MongoDB execution.

## Decision
Use Node.js with strict TypeScript. Organize the application into clear domain modules (auth, users, workspaces, databases, collections, documents, playground, learning, challenges, data-models, gamification) using the service-repository-controller pattern.

## Consequences
- Strict type-safety across API contracts and MongoDB models.
- Modular code enables a 6-person student team to work on separate modules without merge contention.

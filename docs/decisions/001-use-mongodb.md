# ADR 001: Use MongoDB as Version 1 Core Database

## Status
Accepted (Mandatory Faculty Requirement)

## Context
Academic curriculum specifically mandates MongoDB for database concepts, document modeling, and MQL querying. The architecture must enable deep learning around collections, documents, schema flexibility, and aggregation pipelines.

## Decision
MongoDB 6.0+ is the primary core technology for V1, interacted with via the official MongoDB Node.js driver through modular repository and provider abstraction boundaries.

## Consequences
- Deep fidelity to academic requirements.
- Clean separation allows future addition of SQL/PostgreSQL providers in Version 2 without rewriting core learning and challenge infrastructures.

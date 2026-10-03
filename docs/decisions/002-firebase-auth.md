# ADR 002: Firebase Authentication with Server-Side Verification

## Status
Accepted

## Context
User identity must be secure, resilient, and industry-standard without storing plain or hashed user passwords in MongoDB.

## Decision
Adopt Firebase Authentication on the client side (Email/Password, optional Google Sign-in) paired with server-side Firebase Admin SDK token verification. The backend extracts verified Firebase UIDs and authorizes them against internal user metadata.

## Consequences
- Zero password management overhead on the backend.
- Authoritative authorization remains strictly in the Node.js backend.
- Supports seamless development fallbacks for local and testing environments.

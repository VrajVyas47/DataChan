# Testing Strategy

## 1. Test Pyramid
- **Unit Tests**:
  - Acorn AST query parser (verifies parsing of valid MQL queries, chained operators, rejection of malicious identifiers, functions, and globals).
  - Query normalizer and operator validator.
  - Challenge evaluation engine (verifies deterministic comparison of arrays, nested documents, and counts).
  - Data model validation rules (detects missing entities, invalid cardinalities, redundant fields).
- **Integration Tests**:
  - Real MongoDB operations via centralized driver.
  - Virtual database namespace generation and isolation.
  - Document CRUD and collection lifecycle.
  - API endpoint contracts (/api/v1).
- **End-to-End Tests**:
  - Full flow: Register/Login → Create Workspace → Create Database → Create Collection → Insert Document → Run Playground Query → Solve Challenge → Create Data Model → Generate MongoDB Structure.

# ADR 004: AST-Based Query Parsing and Strict Operator Whitelisting

## Status
Accepted

## Context
Allowing students to write MongoDB queries like `db.students.find(...)` poses severe security risks if evaluated dynamically with `eval()`, `vm`, or shell execution.

## Decision
Query strings are parsed into an Abstract Syntax Tree (AST) using Acorn. Only declarative literals, objects, arrays, and unary numbers are extracted. All function declarations, variables, and external identifiers are strictly forbidden. The parsed query is converted into a normalized internal query object and checked against an operator whitelist before being passed to native MongoDB driver methods.

## Consequences
- Guaranteed zero arbitrary JavaScript code execution.
- Predictable, deterministic execution and syntax breakdown generation.
- Defense-in-depth against injection attacks.

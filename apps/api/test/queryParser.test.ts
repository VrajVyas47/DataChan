import { describe, it, expect } from 'vitest';
import { parseMqlQuery } from '../src/security/queryParser';

describe('Safe MQL AST Query Parser', () => {
  it('parses a basic find query on db.students', () => {
    const raw = 'db.students.find({ age: { $gt: 18 } })';
    const { normalized, breakdown } = parseMqlQuery(raw, 'test_db');

    expect(normalized.operation).toBe('find');
    expect(normalized.collection).toBe('students');
    expect(normalized.filter).toEqual({ age: { $gt: 18 } });
    expect(breakdown.some((b) => b.token === '$gt')).toBe(true);
  });

  it('parses chained cursor operators .sort() and .limit()', () => {
    const raw = 'db.students.find({ major: "Computer Science" }).sort({ gpa: -1 }).limit(10)';
    const { normalized } = parseMqlQuery(raw, 'test_db');

    expect(normalized.operation).toBe('find');
    expect(normalized.collection).toBe('students');
    expect(normalized.filter).toEqual({ major: 'Computer Science' });
    expect(normalized.sort).toEqual({ gpa: -1 });
    expect(normalized.limit).toBe(10);
  });

  it('parses insertOne with document', () => {
    const raw = 'db.students.insertOne({ name: "Alice", age: 20, major: "CS" })';
    const { normalized } = parseMqlQuery(raw, 'test_db');

    expect(normalized.operation).toBe('insertOne');
    expect(normalized.collection).toBe('students');
    expect(normalized.document).toEqual({ name: 'Alice', age: 20, major: 'CS' });
  });

  it('parses aggregate with pipeline stages', () => {
    const raw =
      'db.students.aggregate([ { $match: { age: { $gte: 20 } } }, { $group: { _id: "$major", count: { $sum: 1 } } } ])';
    const { normalized, breakdown } = parseMqlQuery(raw, 'test_db');

    expect(normalized.operation).toBe('aggregate');
    expect(normalized.pipeline).toHaveLength(2);
    expect(breakdown.some((b) => b.token === '$match')).toBe(true);
    expect(breakdown.some((b) => b.token === '$group')).toBe(true);
  });

  it('strictly rejects malicious code execution with $where', () => {
    const malicious = 'db.students.find({ $where: "sleep(5000)" })';
    expect(() => parseMqlQuery(malicious, 'test_db')).toThrow(/forbidden/i);
  });

  it('strictly rejects function declarations and eval calls', () => {
    const malicious = 'db.students.find({ age: (function() { return 20; })() })';
    expect(() => parseMqlQuery(malicious, 'test_db')).toThrow(/disallowed/i);
  });

  it('strictly rejects arbitrary global variables', () => {
    const malicious = 'db.students.find({ secret: process.env.SECRET })';
    expect(() => parseMqlQuery(malicious, 'test_db')).toThrow(/disallowed|forbidden/i);
  });
});

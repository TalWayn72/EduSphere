import { describe, it, expect } from 'vitest';
import {
  toCypherLiteral,
  substituteParams,
  parseAgtypeValue,
  unwrapAgeRow,
} from './cypher-parser';

// ---------------------------------------------------------------------------
// toCypherLiteral
// ---------------------------------------------------------------------------

describe('toCypherLiteral', () => {
  it('converts null to Cypher null keyword', () => {
    expect(toCypherLiteral(null)).toBe('null');
  });

  it('converts undefined to Cypher null keyword', () => {
    expect(toCypherLiteral(undefined)).toBe('null');
  });

  it('converts numbers to their string representation', () => {
    expect(toCypherLiteral(42)).toBe('42');
    expect(toCypherLiteral(3.14)).toBe('3.14');
    expect(toCypherLiteral(0)).toBe('0');
    expect(toCypherLiteral(-1)).toBe('-1');
  });

  it('converts booleans to their string representation', () => {
    expect(toCypherLiteral(true)).toBe('true');
    expect(toCypherLiteral(false)).toBe('false');
  });

  it('wraps strings in double quotes', () => {
    expect(toCypherLiteral('hello')).toBe('"hello"');
  });

  it('escapes backslashes in strings', () => {
    expect(toCypherLiteral('path\\to')).toBe('"path\\\\to"');
  });

  it('escapes double quotes in strings', () => {
    expect(toCypherLiteral('say "hi"')).toBe('"say \\"hi\\""');
  });

  it('escapes newlines and carriage returns', () => {
    expect(toCypherLiteral('line1\nline2')).toBe('"line1\\nline2"');
    expect(toCypherLiteral('line1\rline2')).toBe('"line1\\rline2"');
  });

  it('handles combined escape sequences', () => {
    const input = 'a"b\\c\nd';
    const result = toCypherLiteral(input);
    expect(result).toBe('"a\\"b\\\\c\\nd"');
  });

  it('converts non-string non-primitive types via String()', () => {
    expect(toCypherLiteral({})).toBe('"[object Object]"');
  });
});

// ---------------------------------------------------------------------------
// substituteParams
// ---------------------------------------------------------------------------

describe('substituteParams', () => {
  it('replaces $param tokens with literal values', () => {
    const result = substituteParams(
      'MATCH (n) WHERE n.name = $name AND n.age = $age',
      { name: 'Alice', age: 30 }
    );
    expect(result).toBe('MATCH (n) WHERE n.name = "Alice" AND n.age = 30');
  });

  it('leaves unknown $tokens untouched', () => {
    const result = substituteParams('SET n.x = $known, n.y = $unknown', {
      known: 1,
    });
    expect(result).toBe('SET n.x = 1, n.y = $unknown');
  });

  it('replaces null-valued params with Cypher null', () => {
    const result = substituteParams('SET n.x = $val', { val: null });
    expect(result).toBe('SET n.x = null');
  });

  it('handles multiple occurrences of the same param', () => {
    const result = substituteParams('$a + $a', { a: 5 });
    expect(result).toBe('5 + 5');
  });

  it('handles underscore-prefixed params', () => {
    const result = substituteParams('$_id', { _id: 'abc' });
    expect(result).toBe('"abc"');
  });

  it('returns unchanged query when params is empty', () => {
    const query = 'MATCH (n) WHERE n.id = $id';
    expect(substituteParams(query, {})).toBe(query);
  });
});

// ---------------------------------------------------------------------------
// parseAgtypeValue
// ---------------------------------------------------------------------------

describe('parseAgtypeValue', () => {
  it('returns null/undefined unchanged', () => {
    expect(parseAgtypeValue(null)).toBeNull();
    expect(parseAgtypeValue(undefined)).toBeUndefined();
  });

  it('returns non-string values unchanged', () => {
    expect(parseAgtypeValue(42)).toBe(42);
    expect(parseAgtypeValue(true)).toBe(true);
    expect(parseAgtypeValue({ foo: 'bar' })).toEqual({ foo: 'bar' });
  });

  it('extracts properties from a vertex agtype string', () => {
    const vertex =
      '{"id": 123, "label": "Concept", "properties": {"name": "Math"}}::vertex';
    expect(parseAgtypeValue(vertex)).toEqual({ name: 'Math' });
  });

  it('extracts properties from an edge agtype string', () => {
    const edge =
      '{"id": 456, "start_id": 1, "end_id": 2, "properties": {"weight": 0.8}}::edge';
    expect(parseAgtypeValue(edge)).toEqual({ weight: 0.8 });
  });

  it('parses a scalar integer agtype', () => {
    expect(parseAgtypeValue('42::integer')).toBe(42);
  });

  it('parses a scalar text agtype', () => {
    expect(parseAgtypeValue('"hello"::text')).toBe('hello');
  });

  it('parses a boolean agtype', () => {
    expect(parseAgtypeValue('true::boolean')).toBe(true);
  });

  it('parses a plain JSON map without ::type suffix', () => {
    expect(parseAgtypeValue('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('returns cleaned string for non-JSON non-quoted scalar', () => {
    expect(parseAgtypeValue('some-identifier')).toBe('some-identifier');
  });

  it('unwraps quoted non-JSON string', () => {
    expect(parseAgtypeValue('"just a string"')).toBe('just a string');
  });

  it('returns raw value for empty cleaned string', () => {
    expect(parseAgtypeValue('::vertex')).toBe('::vertex');
  });
});

// ---------------------------------------------------------------------------
// unwrapAgeRow
// ---------------------------------------------------------------------------

describe('unwrapAgeRow', () => {
  it('extracts and parses the result column from an AGE row', () => {
    const row = {
      result:
        '{"id": 1, "label": "Concept", "properties": {"title": "Algebra"}}::vertex',
    };
    expect(unwrapAgeRow(row)).toEqual({ title: 'Algebra' });
  });

  it('returns scalar from result column', () => {
    expect(unwrapAgeRow({ result: '99::integer' })).toBe(99);
  });

  it('returns the row as-is when no result column exists', () => {
    const row = { other: 'value' };
    expect(unwrapAgeRow(row)).toEqual({ other: 'value' });
  });

  it('handles null result column', () => {
    expect(unwrapAgeRow({ result: null })).toBeNull();
  });
});

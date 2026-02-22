import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve relative to this test file so the path is stable regardless of cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SUPERGRAPH_PATH = join(__dirname, '..', 'supergraph.graphql');

let schemaSDL = '';

beforeAll(() => {
  if (!existsSync(SUPERGRAPH_PATH)) {
    throw new Error(
      `supergraph.graphql not found at ${SUPERGRAPH_PATH}.\nRun: pnpm --filter @edusphere/gateway compose`,
    );
  }
  schemaSDL = readFileSync(SUPERGRAPH_PATH, 'utf-8');
});

describe('Schema Structural Validation', () => {
  it('supergraph.graphql exists and is non-empty', () => {
    expect(schemaSDL).toBeTruthy();
    expect(schemaSDL.length).toBeGreaterThan(100);
  });

  it('contains Federation @link directives', () => {
    // Supergraph uses Apollo Federation join spec — @link is the federation marker
    expect(schemaSDL).toContain('@link');
    expect(schemaSDL).toContain('join');
  });

  it('has Query root type', () => {
    // Supergraph format: "type Query @join__type(...) {"
    expect(schemaSDL).toMatch(/type Query\b/);
  });

  it('has Mutation root type', () => {
    expect(schemaSDL).toMatch(/type Mutation\b/);
  });

  it('all @deprecated directives include a reason argument', () => {
    const deprecatedWithReason = (schemaSDL.match(/@deprecated\(reason:/g) ?? []).length;
    const deprecatedTotal = (schemaSDL.match(/@deprecated/g) ?? []).length;
    // Every @deprecated must have a reason
    expect(deprecatedWithReason).toBe(deprecatedTotal);
  });

  it('all Input types end with "Input"', () => {
    const inputTypeMatches = schemaSDL.match(/^input\s+(\w+)/gm) ?? [];
    const violations = inputTypeMatches
      .map((match) => match.replace(/^input\s+/, ''))
      .filter((name) => !name.endsWith('Input'));
    expect(violations, `Input types not ending with 'Input': ${violations.join(', ')}`).toHaveLength(0);
  });

  it('has at least 6 entity types (join__type with key field)', () => {
    // Federation supergraph marks entities with @join__type(... key: "id") instead of @key(...)
    const entityCount = (schemaSDL.match(/@join__type\([^)]*key:/g) ?? []).length;
    expect(entityCount).toBeGreaterThanOrEqual(6);
  });

  it('has Subscription root type (required for NATS pub/sub)', () => {
    expect(schemaSDL).toMatch(/type Subscription\b/);
  });

  it('has _health field', () => {
    expect(schemaSDL).toContain('_health');
  });

  it('contains @authenticated directive', () => {
    expect(schemaSDL).toContain('@authenticated');
  });
});

describe('Schema Security Validation', () => {
  it('does not expose password fields', () => {
    expect(schemaSDL).not.toMatch(/^\s+password\s*:/im);
  });

  it('does not expose apiKey fields', () => {
    expect(schemaSDL).not.toMatch(/^\s+apiKey\s*:/im);
  });
});

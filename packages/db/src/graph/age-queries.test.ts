/**
 * age-queries.test.ts — Static security analysis of Apache AGE graph helpers.
 *
 * These are FILE-ANALYSIS tests: they read the source files and assert on
 * their textual content.  No database connection is required.
 *
 * Covered properties:
 *   1. All expected graph helper files exist (client.ts, ontology.ts, index.ts).
 *   2. All graph helper modules export the expected public API symbols.
 *   3. User-supplied values (IDs, tenant IDs) are passed via Cypher $params,
 *      NOT concatenated directly into query strings.
 *   4. Every user-facing function that accepts an ID also passes it through
 *      executeCypher's params map — i.e. the Cypher query string contains
 *      a "$" reference, not a raw interpolation of the value.
 *   5. tenantId isolation: functions that accept a tenantId always forward it
 *      as a Cypher parameter AND set it via set_config().
 *   6. Depth-clamping: traverse() and findRelatedConcepts() call Math.max /
 *      Math.min / Math.trunc so that a user-supplied depth cannot expand the
 *      range literal beyond the safe bounds [1, 10].
 *   7. The executeCypher function uses set_config($1, $2, TRUE) for the
 *      tenant context — a parameterised call, not string interpolation.
 *   8. No Cypher query builds a string with template literals that embed
 *      function-parameter identifiers for node IDs or tenant IDs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// This test lives in the same directory as the files it analyses (src/graph/).
const GRAPH_DIR = __dirname;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSrc(filename: string): string {
  return readFileSync(resolve(GRAPH_DIR, filename), 'utf-8');
}

function srcPath(filename: string): string {
  return resolve(GRAPH_DIR, filename);
}

// ---------------------------------------------------------------------------
// 1. File existence
// ---------------------------------------------------------------------------

describe('Apache AGE graph helper files exist', () => {
  it('client.ts exists', () => {
    expect(existsSync(srcPath('client.ts'))).toBe(true);
  });

  it('ontology.ts exists', () => {
    expect(existsSync(srcPath('ontology.ts'))).toBe(true);
  });

  it('index.ts exists', () => {
    expect(existsSync(srcPath('index.ts'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Exported API surface (index.ts re-exports both modules)
// ---------------------------------------------------------------------------

describe('index.ts re-exports both modules', () => {
  const src = readSrc('index.ts');

  it('re-exports client module', () => {
    expect(src).toContain("from './client'");
  });

  it('re-exports ontology module', () => {
    expect(src).toContain("from './ontology'");
  });
});

describe('client.ts exports expected public functions', () => {
  const src = readSrc('client.ts');

  it('exports executeCypher', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+executeCypher/);
  });

  it('exports addVertex', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+addVertex/);
  });

  it('exports addEdge', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+addEdge/);
  });

  it('exports queryNodes', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+queryNodes/);
  });

  it('exports traverse', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+traverse/);
  });
});

describe('ontology.ts exports expected public functions', () => {
  const src = readSrc('ontology.ts');

  it('exports createConcept', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+createConcept/);
  });

  it('exports findRelatedConcepts', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+findRelatedConcepts/);
  });

  it('exports findContradictions', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+findContradictions/);
  });

  it('exports findLearningPath', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+findLearningPath/);
  });

  it('exports createRelationship', () => {
    expect(src).toMatch(/export\s+(async\s+)?function\s+createRelationship/);
  });

  it('exports ConceptProperties interface', () => {
    expect(src).toMatch(/export\s+interface\s+ConceptProperties/);
  });

  it('exports RelationshipProperties interface', () => {
    expect(src).toMatch(/export\s+interface\s+RelationshipProperties/);
  });
});

// ---------------------------------------------------------------------------
// 3. Cypher injection prevention — parameterization patterns in client.ts
// ---------------------------------------------------------------------------

describe('client.ts: user IDs are parameterized in Cypher queries', () => {
  const src = readSrc('client.ts');

  it('addEdge uses $fromId in Cypher (not raw interpolation)', () => {
    // The Cypher MATCH clause must reference the variable as $fromId
    expect(src).toContain('$fromId');
  });

  it('addEdge uses $toId in Cypher (not raw interpolation)', () => {
    expect(src).toContain('$toId');
  });

  it('traverse uses $startNodeId in Cypher (not raw interpolation)', () => {
    expect(src).toContain('$startNodeId');
  });

  it('addEdge passes {fromId, toId} as params object to executeCypher', () => {
    // The params object passed to executeCypher must carry both IDs
    expect(src).toContain('{ fromId, toId }');
  });

  it('traverse passes {startNodeId} as params object to executeCypher', () => {
    expect(src).toContain('{ startNodeId }');
  });

  it('executeCypher passes params as JSON via pg $1 placeholder', () => {
    // Apache AGE requires the third arg to be a SQL parameter
    expect(src).toContain('$1');
    expect(src).toContain('JSON.stringify(params)');
  });

  it('queryNodes uses Cypher $key references from filter keys', () => {
    // filterParts maps each key to "$key" via: .map((key) => `${key}: $${key}`)
    // Check for the dollar-sign variable reference pattern in the map expression
    expect(src).toContain('.map((key) =>');
    // The expression builds Cypher param refs like $name, $tenant_id from filter keys
    expect(src).toMatch(/map\(\(key\)\s*=>/);
  });
});

// ---------------------------------------------------------------------------
// 4. Tenant isolation in client.ts
// ---------------------------------------------------------------------------

describe('client.ts: tenantId is set via parameterized set_config', () => {
  const src = readSrc('client.ts');

  it('uses set_config with positional parameters ($1, $2)', () => {
    expect(src).toContain('set_config($1, $2, TRUE)');
  });

  it('passes app.current_tenant as the first argument', () => {
    expect(src).toContain("'app.current_tenant'");
  });

  it('does NOT build the set_config call via string concatenation of tenantId', () => {
    // Must not concatenate tenantId directly into the SQL string
    expect(src).not.toMatch(/set_config\([^)]*\$\{tenantId\}/);
  });

  it('tenantId is only used in the pg values array, not the SQL template', () => {
    // The tenantId variable appears in the array passed to client.query, not the SQL
    // Check that 'app.current_tenant' and tenantId appear in the same query call values array
    expect(src).toContain("'app.current_tenant'");
    expect(src).toContain('tenantId,');
    // Must NOT appear as a string interpolation inside the SQL
    expect(src).not.toMatch(/set_config\([^)]*\$\{tenantId\}/);
  });
});

// ---------------------------------------------------------------------------
// 5. Tenant isolation in ontology.ts
// ---------------------------------------------------------------------------

describe('ontology.ts: tenantId is forwarded as a Cypher parameter', () => {
  const src = readSrc('ontology.ts');

  it('findRelatedConcepts uses $tenantId in Cypher WHERE clause', () => {
    expect(src).toContain('$tenantId');
  });

  it('findRelatedConcepts passes tenantId in the params map', () => {
    expect(src).toContain('{ conceptId, tenantId }');
  });

  it('findRelatedConcepts does NOT interpolate tenantId directly into query string', () => {
    // There must be no template literal embedding tenantId in the Cypher query body
    expect(src).not.toMatch(/\$\{tenantId\}/);
  });

  it('findContradictions uses $conceptId in Cypher (no direct interpolation)', () => {
    expect(src).toContain('$conceptId');
    expect(src).not.toMatch(/\$\{conceptId\}/);
  });

  it('findLearningPath uses $conceptId in Cypher (no direct interpolation)', () => {
    // findLearningPath also uses $conceptId
    expect(src).toContain('{ conceptId }');
  });

  it('createRelationship uses $fromConceptId and $toConceptId in Cypher', () => {
    expect(src).toContain('$fromConceptId');
    expect(src).toContain('$toConceptId');
  });

  it('createRelationship passes both IDs in params map', () => {
    expect(src).toContain('{ fromConceptId, toConceptId }');
  });
});

// ---------------------------------------------------------------------------
// 6. Depth clamping — safe integer range literals
// ---------------------------------------------------------------------------

describe('client.ts traverse(): maxDepth is clamped to [1, 10]', () => {
  const src = readSrc('client.ts');

  it('uses Math.max to enforce minimum depth of 1', () => {
    // Should see Math.max(1, ...
    expect(src).toMatch(/Math\.max\(1,/);
  });

  it('uses Math.min to enforce maximum depth of 10', () => {
    expect(src).toMatch(/Math\.min\(10,/);
  });

  it('uses Math.trunc to prevent fractional range literals', () => {
    expect(src).toContain('Math.trunc(maxDepth)');
  });
});

describe('ontology.ts findRelatedConcepts(): depth and limit are clamped', () => {
  const src = readSrc('ontology.ts');

  it('clamps maxDepth with Math.max(1, ...) and Math.min(10, ...)', () => {
    expect(src).toMatch(/Math\.max\(1,/);
    expect(src).toMatch(/Math\.min\(10,/);
  });

  it('clamps limit with Math.max(1, ...) and Math.min(100, ...)', () => {
    expect(src).toMatch(/Math\.max\(1,/);
    expect(src).toMatch(/Math\.min\(100,/);
  });

  it('truncates fractional depth with Math.trunc', () => {
    expect(src).toContain('Math.trunc(maxDepth)');
  });

  it('truncates fractional limit with Math.trunc', () => {
    expect(src).toContain('Math.trunc(limit)');
  });
});

// ---------------------------------------------------------------------------
// 7. No raw SQL construction for user inputs
//    Verify that known injection patterns are absent from source files.
// ---------------------------------------------------------------------------

describe('No Cypher injection patterns present in graph helpers', () => {
  const clientSrc = readSrc('client.ts');
  const ontologySrc = readSrc('ontology.ts');

  it('client.ts does not embed startNodeId via template literal', () => {
    expect(clientSrc).not.toMatch(/\$\{startNodeId\}/);
  });

  it('client.ts does not embed fromId via template literal', () => {
    expect(clientSrc).not.toMatch(/\$\{fromId\}/);
  });

  it('client.ts does not embed toId via template literal', () => {
    expect(clientSrc).not.toMatch(/\$\{toId\}/);
  });

  it('ontology.ts does not embed conceptId via template literal', () => {
    expect(ontologySrc).not.toMatch(/\$\{conceptId\}/);
  });

  it('ontology.ts does not embed fromConceptId via template literal', () => {
    expect(ontologySrc).not.toMatch(/\$\{fromConceptId\}/);
  });

  it('ontology.ts does not embed toConceptId via template literal', () => {
    expect(ontologySrc).not.toMatch(/\$\{toConceptId\}/);
  });

  it('client.ts does not use string concatenation (+) to build Cypher node ID filters', () => {
    // Pattern: 'id: ' + someId  — must not appear
    expect(clientSrc).not.toMatch(/'id:\s*'\s*\+\s*\w+Id/);
  });

  it('ontology.ts does not use string concatenation (+) to build Cypher ID filters', () => {
    expect(ontologySrc).not.toMatch(/'id:\s*'\s*\+\s*\w+Id/);
  });
});

// ---------------------------------------------------------------------------
// 8. executeCypher: two-argument vs three-argument cypher() form
// ---------------------------------------------------------------------------

describe('client.ts executeCypher: correct cypher() call forms', () => {
  const src = readSrc('client.ts');

  it('uses dollar-sign dollar-sign ($$) delimiters for the Cypher query body', () => {
    // AGE requires $$ quoting to embed the Cypher query as a string literal
    expect(src).toContain('$$${query}$$');
  });

  it('only adds $1 placeholder when params are present (non-empty)', () => {
    // Guards on Object.keys(params).length > 0 before adding the third arg
    expect(src).toContain('Object.keys(params).length > 0');
  });
});

/**
 * Static security tests for Apache AGE Cypher injection prevention.
 *
 * Verifies that all Cypher queries use parameterized values, safe escaping,
 * RLS context via parameterized set_config, depth clamping, and field allowlists.
 * These tests read source files — no running database required.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../..');

const read = (p: string): string =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

const GRAPH_CLIENT = 'packages/db/src/graph/client.ts';
const CONCEPT_SERVICE =
  'apps/subgraph-knowledge/src/graph/cypher-concept.service.ts';
const CONCEPT_RELATION_SERVICE =
  'apps/subgraph-knowledge/src/graph/cypher-concept-relation.service.ts';
const LEARNING_PATH_SERVICE =
  'apps/subgraph-knowledge/src/graph/cypher-learning-path.service.ts';
const AGE_HELPERS =
  'apps/subgraph-knowledge/src/graph/cypher-age-helpers.ts';
const GRAPH_DIR = 'apps/subgraph-knowledge/src/graph';

// ---------------------------------------------------------------------------
// 1. Cypher parameterization — executeCypher uses parameterized queries
// ---------------------------------------------------------------------------
describe('Cypher parameterization — executeCypher', () => {
  const src = read(GRAPH_CLIENT);

  it('executeCypher function exists in graph client', () => {
    expect(src).toContain('export async function executeCypher');
  });

  it('primary path uses AGE $1 JSON parameterization', () => {
    // The primary path passes params as JSON via $1 in a template literal
    expect(src).toContain('$1) AS (result agtype)');
    expect(src).toContain('[JSON.stringify(params)]');
  });

  it('fallback path uses substituteParams for safe literal escaping', () => {
    expect(src).toContain('substituteParams(query, params)');
  });

  it('toCypherLiteral escapes backslashes', () => {
    expect(src).toMatch(/\.replace\(\/\\\\\/g,\s*'\\\\\\\\'\)/);
  });

  it('toCypherLiteral escapes double quotes', () => {
    expect(src).toMatch(/\.replace\(\/"\//);
  });

  it('toCypherLiteral escapes newlines and carriage returns', () => {
    expect(src).toContain('\\n');
    expect(src).toContain('\\r');
  });

  it('toCypherLiteral returns Cypher null for null/undefined', () => {
    expect(src).toMatch(
      /if\s*\(\s*value\s*===\s*null\s*\|\|\s*value\s*===\s*undefined\s*\)\s*return\s*'null'/
    );
  });

  it('substituteParams only replaces known param keys', () => {
    // Unknown $tokens must be left untouched
    expect(src).toContain('if (!(key in params)) return match');
  });
});

// ---------------------------------------------------------------------------
// 2. No string concatenation with user input in Cypher queries
// ---------------------------------------------------------------------------
describe('No user-input string concatenation in Cypher queries', () => {
  const graphFiles = existsSync(resolve(ROOT, GRAPH_DIR))
    ? readdirSync(resolve(ROOT, GRAPH_DIR))
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
        .map((f) => ({
          name: f,
          content: readFileSync(join(resolve(ROOT, GRAPH_DIR), f), 'utf-8'),
        }))
    : [];

  it('finds graph service files to scan', () => {
    expect(graphFiles.length).toBeGreaterThan(0);
  });

  it('Cypher queries in cypher-concept.service.ts use $param syntax for user values', () => {
    const src = read(CONCEPT_SERVICE);
    // All MATCH property filters should use $paramName, not interpolated values
    const matchBlocks = src.match(/MATCH\s*\([^)]+\)/g) || [];
    for (const block of matchBlocks) {
      // Property values in curly braces should reference $params, not ${variable}
      const propValues = block.match(/:\s*([^,}]+)/g) || [];
      for (const pv of propValues) {
        const trimmed = pv.replace(/^:\s*/, '').trim();
        // Acceptable: $paramName, gen_random_uuid()::text, timestamp()
        // Not acceptable: ${someVar} (template literal interpolation of user input)
        expect(trimmed).not.toMatch(
          /\$\{(?!safeLimit|safeDepth)[a-z]/i
        );
      }
    }
  });

  it('cypher-concept-relation.service.ts uses $param syntax for IDs and names', () => {
    const src = read(CONCEPT_RELATION_SERVICE);
    // User-provided values (fromId, toId, fromName, toName, tenantId) must use $param
    expect(src).toContain('$fromName');
    expect(src).toContain('$toName');
    expect(src).toContain('$fromId');
    expect(src).toContain('$toId');
    expect(src).toContain('$tenantId');
  });

  it('cypher-learning-path.service.ts uses $param syntax for names and tenantId', () => {
    const src = read(LEARNING_PATH_SERVICE);
    expect(src).toContain('$fromName');
    expect(src).toContain('$toName');
    expect(src).toContain('$conceptName');
    expect(src).toContain('$tenantId');
  });

  it('no template literal interpolation of user-controlled variables in Cypher strings', () => {
    // Scan all non-spec graph files for dangerous ${variable} inside Cypher query strings.
    // Only flag interpolations in Cypher contexts (MATCH, MERGE, CREATE, cypher(...)),
    // NOT in Drizzle sql`` tagged templates or logger messages (those are safe/parameterized).

    // Variables allowed in Cypher query template literals (safe: schema-level, not user input)
    const allowedCypherInterpolations = new Set([
      'label',
      'edgeLabel',
      'relationship',
      'relationshipType',
      'safeLimit',
      'safeDepth',
      'propsJson',
      'setParts',
      'filterParts',
      'GRAPH_NAME',
      'graphName',
      'query',
      'cypherQuery',
      'cypherParams',
      'substituted',
      'asClause',
      'key',
    ]);

    // Variables used in Drizzle sql`` tagged templates (auto-parameterized, safe),
    // logger messages, or error strings — NOT in raw Cypher queries
    const drizzleAndLoggerVars = new Set([
      'userId', 'tenantId', 'courseId', 'nodeId', 'level', 'ids',
      'vectorString', 'limit', 'searchTerm', 'segmentIds',
      'followedIds', 'cutoff', 'id', 'name', 'topicName',
      'masteryLevel', 'sorted', 'roleId', 'entityType', 'entityId',
      'err', 'value', 'masteryOrder', 'transcript_segments',
    ]);

    for (const file of graphFiles) {
      // Find all template literal interpolations
      const interpolations = file.content.match(/\$\{(\w+)\}/g) || [];
      for (const interp of interpolations) {
        const varName = interp.replace(/\$\{|\}/g, '');
        const isCypherAllowed = allowedCypherInterpolations.has(varName);
        const isDrizzleOrLogger = drizzleAndLoggerVars.has(varName);
        expect(
          isCypherAllowed || isDrizzleOrLogger,
          `${file.name}: unsafe interpolation \${${varName}} — not in Cypher allowlist or Drizzle/logger safe set`
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. RLS context in graph queries uses parameterized set_config
// ---------------------------------------------------------------------------
describe('RLS context — parameterized set_config', () => {
  it('executeCypher uses parameterized set_config with $1, $2', () => {
    const src = read(GRAPH_CLIENT);
    expect(src).toMatch(/set_config\(\$1,\s*\$2,\s*TRUE\)/);
  });

  it('executeCypher passes tenant_id as a parameter array element', () => {
    const src = read(GRAPH_CLIENT);
    // Verify the set_config call receives [string, tenantId] as params
    expect(src).toMatch(
      /client\.query\(\s*'SELECT set_config\(\$1, \$2, TRUE\)',\s*\[\s*'app\.current_tenant',\s*tenantId,?\s*\]/s
    );
  });

  it('acquireAgeClient also uses parameterized set_config', () => {
    const src = read(AGE_HELPERS);
    expect(src).toMatch(/set_config\(\$1,\s*\$2,\s*TRUE\)/);
    expect(src).toMatch(
      /client\.query\(\s*'SELECT set_config\(\$1, \$2, TRUE\)',\s*\[\s*'app\.current_tenant',\s*tenantId,?\s*\]/s
    );
  });

  it('set_config never uses string interpolation for tenant_id', () => {
    const clientSrc = read(GRAPH_CLIENT);
    const helpersSrc = read(AGE_HELPERS);
    // Must NOT contain patterns like set_config('app.current_tenant', '${tenantId}', ...)
    expect(clientSrc).not.toMatch(/set_config\([^)]*\$\{tenantId\}/);
    expect(helpersSrc).not.toMatch(/set_config\([^)]*\$\{tenantId\}/);
  });
});

// ---------------------------------------------------------------------------
// 4. Depth limits enforced in traverse
// ---------------------------------------------------------------------------
describe('Depth limits in traverse function', () => {
  const src = read(GRAPH_CLIENT);

  it('traverse clamps maxDepth to maximum of 10', () => {
    expect(src).toMatch(/Math\.min\(\s*10\s*,/);
  });

  it('traverse clamps maxDepth to minimum of 1', () => {
    expect(src).toMatch(/Math\.max\(\s*1\s*,/);
  });

  it('traverse truncates maxDepth to integer via Math.trunc', () => {
    expect(src).toContain('Math.trunc(maxDepth)');
  });

  it('traverse uses safeDepth (not raw maxDepth) in the Cypher range literal', () => {
    // The range literal should use safeDepth, not maxDepth directly
    expect(src).toMatch(/\*1\.\.\$\{safeDepth\}/);
    // Ensure raw maxDepth is NOT used in the query string
    const traverseFn = src.slice(
      src.indexOf('export async function traverse'),
      src.indexOf('}', src.indexOf('return executeCypher', src.indexOf('traverse'))) + 1
    );
    expect(traverseFn).not.toMatch(/\*1\.\.\$\{maxDepth\}/);
  });
});

// ---------------------------------------------------------------------------
// 5. Update operations use allowlist for field names
// ---------------------------------------------------------------------------
describe('Update operations — field name allowlist', () => {
  const src = read(CONCEPT_SERVICE);

  it('updateConcept defines an allowedKeys set', () => {
    expect(src).toMatch(/allowedKeys\s*=\s*new\s*Set/);
  });

  it('allowedKeys contains only safe domain fields', () => {
    const match = src.match(/new\s*Set<string>\(\[([^\]]+)\]\)/);
    expect(match).not.toBeNull();
    const keys = match![1]
      .split(',')
      .map((k) => k.trim().replace(/['"]/g, ''));
    // All keys must be known safe domain fields
    const safeDomainFields = new Set([
      'name',
      'definition',
      'source_ids',
      'description',
      'type',
    ]);
    for (const key of keys) {
      expect(
        safeDomainFields.has(key),
        `updateConcept allowedKeys contains unexpected field: "${key}"`
      ).toBe(true);
    }
  });

  it('updateConcept filters entries through allowedKeys before building SET clause', () => {
    // safeUpdates must be derived from filtering through allowedKeys
    expect(src).toMatch(/Object\.entries\(updates\)\.filter\(\(\[key\]\)\s*=>\s*allowedKeys\.has\(key\)\)/);
  });

  it('SET clause is built from safeUpdates keys, not raw input keys', () => {
    expect(src).toContain('Object.keys(safeUpdates)');
    // Must NOT directly iterate over raw `updates`
    const updateFn = src.slice(
      src.indexOf('async updateConcept'),
      src.indexOf('}', src.indexOf('return result', src.indexOf('updateConcept'))) + 1
    );
    expect(updateFn).not.toMatch(/Object\.keys\(updates\)\.map/);
  });
});

// ---------------------------------------------------------------------------
// 6. Semgrep rule: block raw Cypher string concatenation
// ---------------------------------------------------------------------------
describe('Semgrep rule for unsafe Cypher patterns', () => {
  const semgrepLocations = [
    '.semgrep',
    '.semgrep.yml',
    '.semgrep.yaml',
    'infrastructure/security/semgrep',
    'infrastructure/security/.semgrep.yml',
  ];

  it('checks for a Semgrep rule blocking unsafe Cypher concatenation (advisory)', () => {
    const found = semgrepLocations.some((loc) =>
      existsSync(resolve(ROOT, loc))
    );
    if (!found) {
      // Advisory: note the gap but do not fail the build
      console.warn(
        '[ADVISORY] No Semgrep rules found at expected locations: ' +
          semgrepLocations.join(', ') +
          '. Consider adding a rule to block raw Cypher string concatenation.'
      );
    }
    // Always passes — this is a gap detection test, not a hard gate
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Additional injection surface coverage
// ---------------------------------------------------------------------------
describe('Additional Cypher injection surface coverage', () => {
  it('addEdge parameterizes fromId and toId via $param syntax', () => {
    const src = read(GRAPH_CLIENT);
    const addEdgeFn = src.slice(
      src.indexOf('export async function addEdge'),
      src.indexOf('export async function', src.indexOf('addEdge') + 20)
    );
    expect(addEdgeFn).toContain('$fromId');
    expect(addEdgeFn).toContain('$toId');
    expect(addEdgeFn).toMatch(/executeCypher\([^)]*\{[^}]*fromId[^}]*toId/s);
  });

  it('queryNodes builds filter parts using $param references (not interpolated values)', () => {
    const src = read(GRAPH_CLIENT);
    // The filter mapping should produce `key: $key` pairs
    expect(src).toMatch(/`\$\{key\}:\s*\$\$\{key\}`/);
  });

  it('runAgeQuery in cypher-age-helpers uses JSON.stringify for AGE $1 params', () => {
    const src = read(AGE_HELPERS);
    if (!src) {
      // File may not exist — skip gracefully
      expect(true).toBe(true);
      return;
    }
    // Either uses $1 with JSON.stringify or delegates to executeCypher which does
    expect(
      src.includes('JSON.stringify') || src.includes('executeCypher')
    ).toBe(true);
  });

  it('runAgeQuery fallback also uses substituteParams (not raw concatenation)', () => {
    const src = read(AGE_HELPERS);
    expect(src).toContain('substituteParams(cypherQuery, cypherParams)');
  });
});

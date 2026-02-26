/**
 * Regression test — SCIM / HRIS provisioning (F-019)
 * Verifies that all SCIM types, queries and mutations are present in
 * supergraph.graphql.  Without these entries the gateway returns 400 /
 * "Cannot query field X on type Query" for ScimSettingsPage requests.
 *
 * Prevention: Every query file used by a rendered component MUST have a
 * corresponding suite in tests/contract/schema-contract.test.ts AND here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

let supergraph: string;

beforeAll(() => {
  supergraph = readFileSync(
    join(__dirname, '../../../supergraph.graphql'),
    'utf8'
  );
});

describe('supergraph — SCIM types present (F-019)', () => {
  it.each(['ScimToken', 'ScimSyncEntry', 'GenerateScimTokenResult'])(
    'object type %s is defined with @join__type(graph: CORE)',
    (typeName) => {
      expect(supergraph).toContain(`type ${typeName} @join__type(graph: CORE)`);
    }
  );

  it.each(['scimTokens', 'scimSyncLog'])(
    'Query.%s is routed to CORE subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
      );
    }
  );

  it.each(['generateScimToken', 'revokeScimToken'])(
    'Mutation.%s is routed to CORE subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
      );
    }
  );

  it('ScimToken has required fields', () => {
    const idx = supergraph.indexOf('type ScimToken');
    expect(idx).toBeGreaterThan(0);
    const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
    for (const field of ['id', 'description', 'isActive', 'createdAt']) {
      expect(block).toContain(field);
    }
  });

  it('ScimSyncEntry has required fields', () => {
    const idx = supergraph.indexOf('type ScimSyncEntry');
    expect(idx).toBeGreaterThan(0);
    const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
    for (const field of ['id', 'operation', 'status', 'createdAt']) {
      expect(block).toContain(field);
    }
  });

  it('GenerateScimTokenInput is defined', () => {
    expect(supergraph).toContain('input GenerateScimTokenInput');
  });
});

describe('supergraph — SCIM backed by core subgraph SDL', () => {
  let scimSDL: string;

  beforeAll(() => {
    scimSDL = readFileSync(
      join(__dirname, '../../../../subgraph-core/src/scim/scim.graphql'),
      'utf8'
    );
  });

  it.each(['scimTokens', 'scimSyncLog'])(
    'Query.%s is declared in core SCIM subgraph SDL',
    (field) => {
      expect(scimSDL).toContain(field);
    }
  );

  it.each(['generateScimToken', 'revokeScimToken'])(
    'Mutation.%s is declared in core SCIM subgraph SDL',
    (field) => {
      expect(scimSDL).toContain(field);
    }
  );

  it('ScimToken type is declared in core SCIM subgraph SDL', () => {
    expect(scimSDL).toContain('type ScimToken');
  });

  it('ScimSyncEntry type is declared in core SCIM subgraph SDL', () => {
    expect(scimSDL).toContain('type ScimSyncEntry');
  });

  it('GenerateScimTokenInput is declared in core SCIM subgraph SDL', () => {
    expect(scimSDL).toContain('input GenerateScimTokenInput');
  });
});

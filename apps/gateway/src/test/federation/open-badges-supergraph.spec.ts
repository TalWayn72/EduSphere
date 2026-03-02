/**
 * Regression test — BUG-026
 * Verifies that all Open Badges 3.0 types, queries and mutations are present
 * in supergraph.graphql.  Without these entries the gateway returns
 * "Cannot query field X on type Query".
 *
 * Root cause: supergraph.graphql is maintained manually; when Open Badges
 * fields were added to the core subgraph SDL they were correctly added to
 * supergraph.graphql (Wave 5C/5D), but MyOpenBadgesPage.tsx was shipped and
 * tested with mocked urql responses — so the runtime gap was never caught.
 *
 * Prevention: Every query file used by a rendered component MUST have a
 * corresponding suite in tests/contract/schema-contract.test.ts.
 *
 * NOTE (02 Mar 2026): Open Badges moved from subgraph-core (gamification)
 * to subgraph-content (open-badges).  All @join__type/field now reference
 * graph: CONTENT.  Field renames: verifyOpenBadge→verifyBadge,
 * revokeOpenBadge→revokeBadge.
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

describe('supergraph — Open Badges 3.0 types present (BUG-026 regression)', () => {
  it.each(['OpenBadgeAssertion', 'OpenBadgeDefinition'])(
    'object type %s is defined with @join__type(graph: CONTENT)',
    (typeName) => {
      expect(supergraph).toContain(`type ${typeName} @join__type(graph: CONTENT)`);
    }
  );

  it.each(['myOpenBadges', 'verifyBadge'])(
    'Query.%s is routed to CONTENT subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CONTENT\\)`)
      );
    }
  );

  it.each(['issueBadge', 'revokeBadge'])(
    'Mutation.%s is routed to CONTENT subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CONTENT\\)`)
      );
    }
  );

  it('OpenBadgeAssertion has required fields', () => {
    const idx = supergraph.indexOf('type OpenBadgeAssertion');
    expect(idx).toBeGreaterThan(0);
    const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
    for (const field of [
      'id',
      'badgeDefinitionId',
      'recipientId',
      'issuedAt',
      'revoked',
      'vcDocument',
    ]) {
      expect(block).toContain(field);
    }
  });

  it('OpenBadgeDefinition has required fields', () => {
    const idx = supergraph.indexOf('type OpenBadgeDefinition');
    expect(idx).toBeGreaterThan(0);
    const block = supergraph.slice(idx, supergraph.indexOf('}', idx) + 1);
    for (const field of [
      'id',
      'name',
      'description',
      'issuerId',
    ]) {
      expect(block).toContain(field);
    }
  });
});

describe('supergraph — Open Badges backed by content subgraph SDL', () => {
  let contentOpenBadgeSDL: string;

  beforeAll(() => {
    contentOpenBadgeSDL = readFileSync(
      join(
        __dirname,
        '../../../../subgraph-content/src/open-badges/open-badge.graphql'
      ),
      'utf8'
    );
  });

  it('myOpenBadges is declared in content open-badge subgraph SDL', () => {
    expect(contentOpenBadgeSDL).toContain('myOpenBadges');
  });

  it('verifyBadge is declared in content open-badge subgraph SDL', () => {
    expect(contentOpenBadgeSDL).toContain('verifyBadge');
  });

  it('OpenBadgeAssertion type is declared in content open-badge subgraph SDL', () => {
    expect(contentOpenBadgeSDL).toContain('type OpenBadgeAssertion');
  });

  it('OpenBadgeDefinition type is declared in content open-badge subgraph SDL', () => {
    expect(contentOpenBadgeSDL).toContain('type OpenBadgeDefinition');
  });
});

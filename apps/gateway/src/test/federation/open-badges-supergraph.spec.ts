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
    'object type %s is defined with @join__type(graph: CORE)',
    (typeName) => {
      expect(supergraph).toContain(`type ${typeName} @join__type(graph: CORE)`);
    }
  );

  it.each(['myOpenBadges', 'verifyOpenBadge'])(
    'Query.%s is routed to CORE subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
      );
    }
  );

  it.each(['issueBadge', 'revokeOpenBadge'])(
    'Mutation.%s is routed to CORE subgraph',
    (field) => {
      expect(supergraph).toMatch(
        new RegExp(`${field}[^}]*@join__field\\(graph: CORE\\)`)
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
      'definition',
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
      'createdAt',
    ]) {
      expect(block).toContain(field);
    }
  });
});

describe('supergraph — Open Badges backed by core subgraph SDL', () => {
  let coreGamificationSDL: string;

  beforeAll(() => {
    coreGamificationSDL = readFileSync(
      join(
        __dirname,
        '../../../../subgraph-core/src/gamification/gamification.graphql'
      ),
      'utf8'
    );
  });

  it('myOpenBadges is declared in core gamification subgraph SDL', () => {
    expect(coreGamificationSDL).toContain('myOpenBadges');
  });

  it('verifyOpenBadge is declared in core gamification subgraph SDL', () => {
    expect(coreGamificationSDL).toContain('verifyOpenBadge');
  });

  it('OpenBadgeAssertion type is declared in core gamification subgraph SDL', () => {
    expect(coreGamificationSDL).toContain('type OpenBadgeAssertion');
  });

  it('OpenBadgeDefinition type is declared in core gamification subgraph SDL', () => {
    expect(coreGamificationSDL).toContain('type OpenBadgeDefinition');
  });
});

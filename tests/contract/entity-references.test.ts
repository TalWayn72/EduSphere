/** Entity Reference Tests
 * Validates Federation entity presence across subgraphs using the supergraph SDL.
 */
import { describe, it, expect } from 'vitest';
import { parse, buildASTSchema } from 'graphql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const supergraphSDL = readFileSync(
  path.join(root, 'apps/gateway/supergraph.graphql'),
  'utf-8'
);

/**
 * Returns distinct subgraph names that appear in @join__type(graph: X) on the
 * type definition line for typeName in the supergraph SDL.
 */
function getSubgraphsForType(typeName: string): string[] {
  const nl = String.fromCharCode(10);
  const lines = supergraphSDL.split(nl);
  const typeLine = lines.find((l) => l.startsWith('type ' + typeName + ' '));
  if (!typeLine) return [];
  // Extract all graph: VALUE substrings from the type line
  const results: string[] = [];
  const marker = '@join__type(graph: ';
  let pos = 0;
  while (true) {
    const idx = typeLine.indexOf(marker, pos);
    if (idx === -1) break;
    const start = idx + marker.length;
    const end = typeLine.indexOf(')', start);
    if (end === -1) break;
    const graphName = typeLine.slice(start, end).split(',')[0]?.trim();
    if (graphName && !results.includes(graphName)) results.push(graphName);
    pos = end + 1;
  }
  return results;
}

describe('Entity References - Federation subgraph coverage', () => {
  it('supergraph SDL is parseable', () => {
    expect(() =>
      buildASTSchema(parse(supergraphSDL), { assumeValidSDL: true })
    ).not.toThrow();
  });

  it('join__Graph enum has at least 6 subgraphs', () => {
    const marker = 'enum join__Graph';
    const markerIdx = supergraphSDL.indexOf(marker);
    expect(markerIdx).toBeGreaterThan(-1);
    const openBrace = supergraphSDL.indexOf('{', markerIdx);
    const closeBrace = supergraphSDL.indexOf('}', openBrace);
    const block = supergraphSDL.slice(openBrace + 1, closeBrace);
    const nl = String.fromCharCode(10);
    const entries = block
      .trim()
      .split(nl)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('//'));
    expect(entries.length).toBeGreaterThanOrEqual(6);
  });

  it('User entity is federated across at least 4 subgraphs', () => {
    expect(getSubgraphsForType('User').length).toBeGreaterThanOrEqual(4);
  });

  it('Course entity is federated across at least 3 subgraphs', () => {
    expect(getSubgraphsForType('Course').length).toBeGreaterThanOrEqual(3);
  });

  it('Annotation entity is owned by ANNOTATION subgraph', () => {
    expect(getSubgraphsForType('Annotation')).toContain('ANNOTATION');
  });

  it('AgentSession entity is owned by AGENT subgraph', () => {
    expect(getSubgraphsForType('AgentSession')).toContain('AGENT');
  });

  it('Concept entity is owned by KNOWLEDGE subgraph', () => {
    expect(getSubgraphsForType('Concept')).toContain('KNOWLEDGE');
  });

  it('ContentItem entity spans ANNOTATION, CONTENT, KNOWLEDGE', () => {
    const subs = getSubgraphsForType('ContentItem');
    expect(subs).toContain('ANNOTATION');
    expect(subs).toContain('CONTENT');
    expect(subs).toContain('KNOWLEDGE');
  });

  it('Module entity is owned by CONTENT subgraph', () => {
    expect(getSubgraphsForType('Module')).toContain('CONTENT');
  });

  it('Tenant entity is owned by CORE subgraph', () => {
    expect(getSubgraphsForType('Tenant')).toContain('CORE');
  });

  it('Query type spans all 6 subgraphs', () => {
    expect(getSubgraphsForType('Query').length).toBeGreaterThanOrEqual(6);
  });

  it('Mutation type spans at least 5 subgraphs', () => {
    expect(getSubgraphsForType('Mutation').length).toBeGreaterThanOrEqual(5);
  });

  it('Subscription type includes AGENT and ANNOTATION', () => {
    const subs = getSubgraphsForType('Subscription');
    expect(subs).toContain('AGENT');
    expect(subs).toContain('ANNOTATION');
  });

  it('Discussion entity is owned by COLLABORATION subgraph', () => {
    expect(getSubgraphsForType('Discussion')).toContain('COLLABORATION');
  });
});

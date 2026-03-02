#!/usr/bin/env node
// Compose supergraph from all running subgraphs
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const path = require('path');

const { composeServices } = require('@theguild/federation-composition');
const { parse } = require('graphql');

const SUBGRAPHS = [
  {
    name: 'core',
    url: process.env.SUBGRAPH_CORE_URL ?? 'http://localhost:4001/graphql',
  },
  {
    name: 'content',
    url: process.env.SUBGRAPH_CONTENT_URL ?? 'http://localhost:4002/graphql',
  },
  {
    name: 'annotation',
    url: process.env.SUBGRAPH_ANNOTATION_URL ?? 'http://localhost:4003/graphql',
  },
  {
    name: 'collaboration',
    url:
      process.env.SUBGRAPH_COLLABORATION_URL ?? 'http://localhost:4004/graphql',
  },
  {
    name: 'agent',
    url: process.env.SUBGRAPH_AGENT_URL ?? 'http://localhost:4005/graphql',
  },
  {
    name: 'knowledge',
    url: process.env.SUBGRAPH_KNOWLEDGE_URL ?? 'http://localhost:4006/graphql',
  },
];

/**
 * Normalize @requiresScopes to federation-compatible [[scope]!]! format.
 * - Fixes directive definition: [String!]! → [[String!]!]!
 * - Fixes usage: ensures all elements in the outer scopes list are inner lists.
 *   Handles the NestJS/Yoga SDL reflection bug that emits mixed
 *   [["scope"], "scope"] when SDL file has [["scope"]] but compiled
 *   decorator still emits the old ["scope"] format.
 * This transform is idempotent.
 */
function normalizeRequiresScopes(sdl) {
  // Fix directive definition: [String!]! → [[String!]!]!
  let out = sdl.replace(
    /directive @requiresScopes\(scopes: \[String!\]!\)/g,
    'directive @requiresScopes(scopes: [[String!]!]!)'
  );
  // Fix usage: normalize all scopes values to [[...]] format.
  // Handles bare strings at the outer level, deduplicates identical inner lists.
  out = out.replace(/@requiresScopes\(scopes:\s*(\[[^\n]+?\])\)/g, (match, scopesVal) => {
    try {
      const parsed = JSON.parse(scopesVal);
      const normalized = parsed.map((item) =>
        Array.isArray(item) ? item : [item]
      );
      const seen = new Set();
      const deduped = normalized.filter((item) => {
        const key = JSON.stringify([...item].sort());
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return `@requiresScopes(scopes: ${JSON.stringify(deduped)})`;
    } catch {
      return match;
    }
  });
  return out;
}

/**
 * Strip OpenBadge types/fields from core's SDL.
 * Core's baked-image dist still has OpenBadge NestJS resolvers that contribute
 * SDL alongside the SDL files. Content subgraph owns these types exclusively.
 * This transform removes the conflicting definitions from core's SDL so
 * federation composition succeeds without rebuilding the Docker image.
 */
function normalizeCoreSdl(sdl) {
  // Remove OpenBadgeDefinition type block
  let out = sdl.replace(/"""[^"]*"""\s*type OpenBadgeDefinition\s*\{[^}]*\}/gs, '');
  out = out.replace(/type OpenBadgeDefinition\s*\{[^}]*\}/gs, '');
  // Remove OpenBadgeAssertion type block
  out = out.replace(/"""[^"]*"""\s*type OpenBadgeAssertion\s*\{[^}]*\}/gs, '');
  out = out.replace(/type OpenBadgeAssertion\s*\{[^}]*\}/gs, '');
  // Remove BadgeVerificationResult type block (also owned by content)
  out = out.replace(/"""[^"]*"""\s*type BadgeVerificationResult\s*\{[^}]*\}/gs, '');
  out = out.replace(/type BadgeVerificationResult\s*\{[^}]*\}/gs, '');
  // Remove OpenBadge queries from any extend type Query block
  out = out.replace(/\s*"""[^"]*"""\s*myOpenBadges[^!]*![^\n]*/gs, (m) =>
    m.includes('myOpenBadges') ? '' : m
  );
  out = out.replace(/\s*myOpenBadges[^\n]*/g, '');
  out = out.replace(/\s*"""[^"]*"""\s*verifyBadge[^!]*![^\n]*/gs, (m) =>
    m.includes('verifyBadge') ? '' : m
  );
  out = out.replace(/\s*verifyBadge[^\n]*/g, '');
  out = out.replace(/\s*verifyOpenBadge[^\n]*/g, '');
  // Remove OpenBadge mutations from any extend type Mutation block
  // issueBadge from core has different signature than content (recipientId vs userId)
  // Remove the entire core issueBadge/revokeOpenBadge lines
  out = out.replace(/\s*"""[^"]*"""\s*issueBadge\([^)]*\)[^!]*![^\n]*/gs, (m) =>
    m.includes('issueBadge') ? '' : m
  );
  out = out.replace(/\s*issueBadge\([^)]*\)[^\n]*/g, '');
  out = out.replace(/\s*revokeOpenBadge[^\n]*/g, '');
  // Remove empty extend type Query {} and extend type Mutation {} blocks left behind
  out = out.replace(/extend\s+type\s+Query\s*\{\s*\}/g, '');
  out = out.replace(/extend\s+type\s+Mutation\s*\{\s*\}/g, '');
  return out;
}

async function fetchSDL(name, url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ _service { sdl } }' }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    let sdl = normalizeRequiresScopes(data.data._service.sdl);
    if (name === 'core') sdl = normalizeCoreSdl(sdl);
    return sdl;
  } catch (err) {
    console.error(`  FAIL ${name}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Composing supergraph from subgraphs...');

  const services = [];
  for (const { name, url } of SUBGRAPHS) {
    process.stdout.write(`  Fetching SDL from ${name}... `);
    const sdl = await fetchSDL(name, url);
    if (sdl) {
      console.log('OK');
      services.push({ name, url, typeDefs: parse(sdl) });
    }
  }

  if (services.length === 0) {
    console.error('No subgraphs reachable!');
    process.exit(1);
  }

  console.log(`\nComposing ${services.length} subgraphs...`);
  const result = composeServices(services);

  if (result.errors && result.errors.length > 0) {
    console.error('Composition errors:');
    result.errors.forEach((e) => console.error(' -', e.message));
    if (!result.supergraphSdl) process.exit(1);
    console.warn('Continuing with warnings...');
  }

  const outPath = path.join(__dirname, 'supergraph.graphql');
  writeFileSync(outPath, result.supergraphSdl);
  console.log(`\nSupergraph written to ${outPath}`);
  console.log(`Schema size: ${result.supergraphSdl.length} chars`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

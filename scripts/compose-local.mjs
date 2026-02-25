#!/usr/bin/env node
/**
 * Compose supergraph from local SDL files (no live services required).
 * Reads .graphql files from each subgraph's src/ directory,
 * merges them with @graphql-tools/merge, and composes the supergraph.
 */
import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const { composeServices } = require('@theguild/federation-composition');
const { parse } = require('graphql');
const { mergeTypeDefs } = require('@graphql-tools/merge');

const SUBGRAPHS = [
  { name: 'core',          dir: 'apps/subgraph-core/src',          url: 'http://localhost:4001/graphql' },
  { name: 'content',       dir: 'apps/subgraph-content/src',       url: 'http://localhost:4002/graphql' },
  { name: 'annotation',    dir: 'apps/subgraph-annotation/src',    url: 'http://localhost:4003/graphql' },
  { name: 'collaboration', dir: 'apps/subgraph-collaboration/src', url: 'http://localhost:4004/graphql' },
  { name: 'agent',         dir: 'apps/subgraph-agent/src',         url: 'http://localhost:4005/graphql' },
  { name: 'knowledge',     dir: 'apps/subgraph-knowledge/src',     url: 'http://localhost:4006/graphql' },
];

/**
 * Strip non-standard EduSphere custom directives from @link import lists.
 * @requiresRole and @requiresScopes are application-layer directives not
 * recognized by @theguild/federation-composition. Removing them from the
 * @link import list lets composition proceed without errors. The directives
 * themselves remain in the SDL and are enforced by the NestJS middleware.
 */
function preprocessSDL(content) {
  return content.replace(/@link\(([^)]+)\)/g, (match, body) => {
    const fixed = body
      .replace(/"@requiresRole"\s*,?\s*/g, '')
      .replace(/"@requiresScopes"\s*,?\s*/g, '')
      // Clean up trailing comma before ]
      .replace(/,\s*]/g, ']')
      // Clean up leading comma after [
      .replace(/\[\s*,\s*/g, '[');
    return `@link(${fixed})`;
  });
}

function loadSubgraphSDL(subgraphDir) {
  const absoluteDir = join(rootDir, subgraphDir);
  const files = globSync('**/*.graphql', { cwd: absoluteDir, absolute: true });

  if (files.length === 0) {
    console.warn(`  No .graphql files found in ${subgraphDir}`);
    return null;
  }

  const typeDefs = files.map(file => {
    const raw = readFileSync(file, 'utf-8');
    const content = preprocessSDL(raw);
    try {
      return parse(content);
    } catch (err) {
      console.warn(`  Warning: failed to parse ${file}: ${err.message}`);
      return null;
    }
  }).filter(Boolean);

  if (typeDefs.length === 0) return null;

  try {
    const merged = mergeTypeDefs(typeDefs);
    return merged;
  } catch (err) {
    console.warn(`  Warning: failed to merge typeDefs for ${subgraphDir}: ${err.message}`);
    return typeDefs[0];
  }
}

async function main() {
  console.log('Composing supergraph from local SDL files...\n');

  const services = [];

  for (const { name, dir, url } of SUBGRAPHS) {
    process.stdout.write(`  Loading SDL for ${name} from ${dir}... `);
    const typeDefs = loadSubgraphSDL(dir);

    if (typeDefs) {
      console.log('OK');
      services.push({ name, url, typeDefs });
    } else {
      console.log('SKIP (no files)');
    }
  }

  if (services.length === 0) {
    console.error('\nNo subgraph SDL files found!');
    process.exit(1);
  }

  console.log(`\nComposing ${services.length} subgraphs...`);
  const result = composeServices(services);

  if (result.errors && result.errors.length > 0) {
    console.error('\nComposition errors:');
    result.errors.forEach(e => console.error(' -', e.message));
    if (!result.supergraphSdl) {
      console.error('\nComposition failed — no supergraph generated.');
      process.exit(1);
    }
    console.warn('\nComposition completed with warnings (supergraph still generated).');
  }

  const outPath = join(rootDir, 'apps/gateway/supergraph.graphql');
  writeFileSync(outPath, result.supergraphSdl);

  const lines = result.supergraphSdl.split('\n').length;
  console.log(`\nSupergraph written to ${outPath}`);
  console.log(`Schema: ${result.supergraphSdl.length} chars, ${lines} lines`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

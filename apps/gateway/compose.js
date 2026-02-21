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
  { name: 'core',          url: 'http://localhost:4001/graphql' },
  { name: 'content',       url: 'http://localhost:4002/graphql' },
  { name: 'annotation',    url: 'http://localhost:4003/graphql' },
  { name: 'collaboration', url: 'http://localhost:4004/graphql' },
  { name: 'agent',         url: 'http://localhost:4005/graphql' },
  { name: 'knowledge',     url: 'http://localhost:4006/graphql' },
];

async function fetchSDL(name, url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ _service { sdl } }' }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return data.data._service.sdl;
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
    result.errors.forEach(e => console.error(' -', e.message));
    if (!result.supergraphSdl) process.exit(1);
    console.warn('Continuing with warnings...');
  }

  const outPath = path.join(__dirname, 'supergraph.graphql');
  writeFileSync(outPath, result.supergraphSdl);
  console.log(`\nSupergraph written to ${outPath}`);
  console.log(`Schema size: ${result.supergraphSdl.length} chars`);
}

main().catch(err => { console.error(err); process.exit(1); });

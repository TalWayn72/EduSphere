import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Regression test for vite manualChunks ordering.
 *
 * The vendor-collab rule (collaboration extensions, yjs, hocuspocus) MUST appear
 * BEFORE the general @tiptap/ rule. Otherwise @tiptap/extension-collaboration*
 * lands in vendor-tiptap, creating a vendor-tiptap -> vendor-collab dependency
 * that causes TDZ errors ("Cannot access 'Hn' before initialization").
 *
 * Rather than importing the Vite config (which pulls in plugins and requires
 * resolution), we extract and eval the manualChunks function from source.
 */

// ---------------------------------------------------------------------------
// Extract the manualChunks function from vite.config.ts
// ---------------------------------------------------------------------------
const viteConfigSource = fs.readFileSync(
  path.resolve(__dirname, '../../vite.config.ts'),
  'utf-8',
);

function extractManualChunks(): (id: string) => string | undefined {
  // Grab the function body between `manualChunks(id) {` and its closing `},`
  const fnMatch = viteConfigSource.match(
    /manualChunks\(id\)\s*\{([\s\S]*?)\n {8}\}/,
  );
  if (!fnMatch) throw new Error('Could not extract manualChunks from vite.config.ts');

  const fnBody = fnMatch[1];
  // eslint-disable-next-line no-new-func
  return new Function('id', fnBody) as (id: string) => string | undefined;
}

const manualChunks = extractManualChunks();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('vite manualChunks — vendor-collab before vendor-tiptap', () => {
  describe('collaboration packages route to vendor-collab', () => {
    const collabCases: [string, string][] = [
      ['@tiptap/extension-collaboration', 'node_modules/@tiptap/extension-collaboration/dist/index.js'],
      ['@tiptap/y-tiptap', 'node_modules/@tiptap/y-tiptap/dist/index.js'],
      ['yjs', 'node_modules/yjs/dist/yjs.mjs'],
      ['lib0', 'node_modules/lib0/dist/index.js'],
      ['@hocuspocus/provider', 'node_modules/@hocuspocus/provider/dist/index.js'],
    ];

    it.each(collabCases)(
      '%s -> vendor-collab',
      (_label, id) => {
        expect(manualChunks(id)).toBe('vendor-collab');
      },
    );
  });

  describe('general tiptap/prosemirror packages route to vendor-tiptap (NOT vendor-collab)', () => {
    const tiptapCases: [string, string][] = [
      ['@tiptap/react', 'node_modules/@tiptap/react/dist/index.js'],
      ['@tiptap/starter-kit', 'node_modules/@tiptap/starter-kit/dist/index.js'],
      ['prosemirror-state', 'node_modules/prosemirror-state/dist/index.js'],
    ];

    it.each(tiptapCases)(
      '%s -> vendor-tiptap',
      (_label, id) => {
        expect(manualChunks(id)).toBe('vendor-tiptap');
      },
    );
  });

  it('vendor-collab rule appears BEFORE vendor-tiptap rule in source order', () => {
    const collabIndex = viteConfigSource.indexOf("return 'vendor-collab'");
    const tiptapIndex = viteConfigSource.indexOf("return 'vendor-tiptap'");
    expect(collabIndex).toBeGreaterThan(-1);
    expect(tiptapIndex).toBeGreaterThan(-1);
    expect(collabIndex).toBeLessThan(tiptapIndex);
  });

  it('source contains the explanatory comment about ordering', () => {
    expect(viteConfigSource).toContain(
      'MUST be checked BEFORE general @tiptap/ rule',
    );
  });
});

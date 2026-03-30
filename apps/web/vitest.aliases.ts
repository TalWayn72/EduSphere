import path from 'path';
import type { Alias } from 'vite';

// Stub path for tiptap packages that are not linked in apps/web/node_modules
// (pnpm virtual store symlinks are missing at the workspace level).
// All of these packages are mocked via vi.mock() in the relevant test files;
// the aliases let Vitest resolve the module path without throwing
// "Failed to resolve import".
const tiptapStub = path.resolve(__dirname, './src/test/stubs/tiptap-stub.ts');
// GSAP stubs — GSAP uses browser APIs (requestAnimationFrame, etc.) not available in jsdom.
// The stubs replace all GSAP calls with no-ops so component tests can run without crashing.
const gsapStub = path.resolve(__dirname, './src/test/stubs/gsap-stub.ts');
const gsapReactStub = path.resolve(__dirname, './src/test/stubs/gsap-react-stub.ts');
// virtual:pwa-register — Vite virtual module not available outside Vite dev/build;
// stub lets Vitest resolve the import in pwa.ts without crashing.
const pwaRegisterStub = path.resolve(__dirname, './src/test/stubs/pwa-register-stub.ts');
// Three.js stubs — package is not installed; stubs allow Vite import-analysis
// to resolve the paths; vi.mock() replaces the exports at test runtime.
const threeStub = path.resolve(__dirname, './src/test/stubs/three-stub.ts');
const threeGltfStub = path.resolve(__dirname, './src/test/stubs/three-gltf-stub.ts');
const threeOrbitStub = path.resolve(__dirname, './src/test/stubs/three-orbit-stub.ts');
// Each @tiptap/pm/* package and @tiptap/core needs its own distinct stub file.
// Vitest uses the resolved file path as the module-cache key, so if multiple
// packages alias to the same file, vi.mock() calls overwrite each other
// (last writer wins).  Separate files = separate cache slots = safe isolation.
const tiptapCoreStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-core-stub.ts'
);
const tiptapPmStateStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-state-stub.ts'
);
const tiptapPmViewStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-view-stub.ts'
);
const tiptapPmModelStub = path.resolve(
  __dirname,
  './src/test/stubs/tiptap-pm-model-stub.ts'
);

/** All resolve aliases needed for Vitest to find stubbed packages. */
export const vitestAliases: Alias[] = [
  { find: '@', replacement: path.resolve(__dirname, './src') },
  // Tiptap extension stubs — packages exist in pnpm virtual store but
  // are not symlinked into apps/web/node_modules. vi.mock() intercepts
  // these in tests; the alias just provides a resolvable path.
  { find: '@tiptap/extension-code-block-lowlight', replacement: tiptapStub },
  { find: '@tiptap/extension-collaboration', replacement: tiptapStub },
  { find: '@tiptap/extension-collaboration-cursor', replacement: tiptapStub },
  { find: '@tiptap/extension-mathematics', replacement: tiptapStub },
  { find: '@tiptap/extension-mention', replacement: tiptapStub },
  { find: '@tiptap/extension-placeholder', replacement: tiptapStub },
  { find: '@tiptap/extension-table', replacement: tiptapStub },
  { find: '@tiptap/extension-table-row', replacement: tiptapStub },
  { find: '@tiptap/extension-table-cell', replacement: tiptapStub },
  { find: '@tiptap/extension-table-header', replacement: tiptapStub },
  { find: '@tiptap/extension-task-list', replacement: tiptapStub },
  { find: '@tiptap/extension-task-item', replacement: tiptapStub },
  { find: '@tiptap/extension-image', replacement: tiptapStub },
  { find: '@tiptap/react', replacement: tiptapStub },
  { find: '@tiptap/starter-kit', replacement: tiptapStub },
  { find: 'lowlight', replacement: tiptapStub },
  { find: '@hocuspocus/provider', replacement: tiptapStub },
  // CSS imports from katex — not needed in jsdom tests
  { find: 'katex/dist/katex.min.css', replacement: tiptapStub },
  // Each ProseMirror / Tiptap-core package gets a dedicated stub file so that
  // Vitest assigns each a separate module-cache slot.
  { find: '@tiptap/core', replacement: tiptapCoreStub },
  { find: '@tiptap/pm/state', replacement: tiptapPmStateStub },
  { find: '@tiptap/pm/view', replacement: tiptapPmViewStub },
  { find: '@tiptap/pm/model', replacement: tiptapPmModelStub },
  // react-resizable-panels — not testable in jsdom, stub for UI component tests
  { find: 'react-resizable-panels', replacement: tiptapStub },
  // Three.js — not installed; stubs allow Vite import-analysis to pass.
  // Subpath entries use regex `find` and MUST be listed before the root 'three'
  // entry, otherwise 'three' prefix-matches subpaths first.
  { find: /^three\/examples\/jsm\/loaders\/GLTFLoader\.js$/, replacement: threeGltfStub },
  { find: /^three\/examples\/jsm\/controls\/OrbitControls\.js$/, replacement: threeOrbitStub },
  { find: /^three$/, replacement: threeStub },
  // GSAP — uses browser APIs not available in jsdom; stub all GSAP imports.
  { find: /^gsap\/ScrollTrigger$/, replacement: gsapStub },
  { find: /^gsap$/, replacement: gsapStub },
  { find: /^@gsap\/react$/, replacement: gsapReactStub },
  // virtual:pwa-register — Vite-only virtual module
  { find: /^virtual:pwa-register$/, replacement: pwaRegisterStub },
];

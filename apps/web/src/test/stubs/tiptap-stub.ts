/**
 * Generic stub for Tiptap extensions and related packages that cannot be
 * resolved in the jsdom test environment (pnpm virtual store symlinks are
 * missing at the workspace level). All of these packages are mocked via
 * vi.mock() in the relevant test files; this stub simply allows Vitest to
 * resolve the module path without throwing "Failed to resolve import".
 */

// Default export: an extension-like object with a configure stub
const stub = {
  configure: () => ({}),
  extend: () => stub,
};

export default stub;

// Named exports that some extensions expose
export const lowlight = {};
export const HocuspocusProvider = class {};

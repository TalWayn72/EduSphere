/**
 * Stub for @tiptap/core — must be a separate file from tiptap-stub.ts so that
 * Vitest treats it as a distinct module ID. When multiple packages alias to the
 * same file path, vi.mock() calls for each share one module-cache slot and
 * overwrite each other.  Separate files = separate module IDs = safe isolation.
 */

const stub = {
  configure: () => ({}),
  extend: () => stub,
};

export default stub;

// @tiptap/core named exports used in production code and tests
export const Extension = {
  create: (config: Record<string, unknown>) => config,
};
export const Node = {
  create: (config: Record<string, unknown>) => config,
};
export const Mark = {
  create: (config: Record<string, unknown>) => config,
};

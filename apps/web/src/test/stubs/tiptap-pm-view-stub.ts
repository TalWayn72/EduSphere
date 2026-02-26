/**
 * Stub for @tiptap/pm/view — separate file so Vitest assigns it a distinct
 * module-cache slot from @tiptap/pm/state and @tiptap/pm/model.
 */
export const Decoration = {
  inline: (_from: number, _to: number, _attrs: Record<string, string>) => ({}),
  node: (_from: number, _to: number, _attrs: Record<string, string>) => ({}),
  widget: (_pos: number, _toDOM: () => globalThis.Node) => ({}),
};
export const DecorationSet = {
  create: (_doc: unknown, _decorations: unknown[]) => ({
    decorations: _decorations,
  }),
  empty: { decorations: [] },
};
export const EditorView = class {};

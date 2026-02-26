/**
 * Stub for @tiptap/pm/state — separate file so Vitest assigns it a distinct
 * module-cache slot from @tiptap/pm/view and @tiptap/pm/model.
 */
export const Plugin = class {};
export const PluginKey = class {
  constructor(public name: string) {}
  getState(_state: unknown) {
    return undefined;
  }
};
export const Transaction = class {};
export const EditorState = class {};

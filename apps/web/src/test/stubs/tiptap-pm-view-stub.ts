export const EditorView = function EditorView() {};
export const Decoration = {
  inline: () => ({}),
  node: () => ({}),
  widget: () => ({}),
};
export const DecorationSet = {
  create: () => ({ find: () => [], map: () => DecorationSet.empty }),
  empty: { find: () => [], map: () => ({}) },
};
export default {};

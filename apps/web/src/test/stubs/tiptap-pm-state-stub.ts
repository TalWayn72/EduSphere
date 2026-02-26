export const Plugin = function Plugin(
  this: Record<string, unknown>,
  spec: unknown
) {
  Object.assign(this, spec);
};
export const PluginKey = function PluginKey(
  this: Record<string, unknown>,
  name: string
) {
  this.name = name;
  this.key = name + '$';
};
export const EditorState = { create: () => ({}) };
export const Transaction = {};
export const Selection = {};
export const TextSelection = { create: () => ({}) };
export const NodeSelection = {};
export const AllSelection = {};
export const StateField = {};
export default {};

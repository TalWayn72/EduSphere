export const Extension = {
  create: (config: Record<string, unknown>) => config,
};
export const Node = {
  create: (config: Record<string, unknown>) => config,
};
export const Mark = {
  create: (config: Record<string, unknown>) => config,
};
export const mergeAttributes = (...attrs: Record<string, unknown>[]) =>
  Object.assign({}, ...attrs);
export const getExtensionField = () => undefined;
export default {};

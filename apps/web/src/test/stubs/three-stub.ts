/**
 * Stub for the 'three' package in Vitest/jsdom tests.
 * Three.js is not installed; this stub allows Vitest/Vite to resolve the
 * import path without throwing "Failed to resolve import". The actual
 * module is replaced at test runtime via vi.mock('three', ...).
 */

export const WebGLRenderer = class {};
export const Scene = class {};
export const PerspectiveCamera = class {};
export const AmbientLight = class {};
export const DirectionalLight = class {};

export default {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
};

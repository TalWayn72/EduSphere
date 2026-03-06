import { describe, it, expect, vi, beforeEach, afterAll, type Mock } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';

// ── Hoisted mock fns (must be declared before vi.mock factories) ──────────────

const {
  mockDispose,
  mockRendererSetSize,
  mockRendererRender,
  mockControlsUpdate,
  mockControlsDispose,
  mockSceneAdd,
  mockTraverse,
  mockLoaderLoad,
  mockResizeObserverDisconnect,
  mockResizeObserverObserve,
  mockCancelAnimationFrame,
} = vi.hoisted(() => ({
  mockDispose: vi.fn(),
  mockRendererSetSize: vi.fn(),
  mockRendererRender: vi.fn(),
  mockControlsUpdate: vi.fn(),
  mockControlsDispose: vi.fn(),
  mockSceneAdd: vi.fn(),
  mockTraverse: vi.fn(),
  mockLoaderLoad: vi.fn(),
  mockResizeObserverDisconnect: vi.fn(),
  mockResizeObserverObserve: vi.fn(),
  mockCancelAnimationFrame: vi.fn(),
}));

// ── Three.js mocks ────────────────────────────────────────────────────────────

const mockRenderer = {
  setSize: mockRendererSetSize,
  setPixelRatio: vi.fn(),
  render: mockRendererRender,
  dispose: mockDispose,
  domElement: document.createElement('canvas'),
};

const mockScene = {
  add: mockSceneAdd,
};

const mockCamera = {
  position: { set: vi.fn() },
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
};

const mockAmbientLight = {};
const mockDirLight = { position: { set: vi.fn() } };

const mockControls = {
  update: mockControlsUpdate,
  dispose: mockControlsDispose,
};

const mockGLTFLoader = {
  load: mockLoaderLoad,
};

const mockLoadedObject = {
  traverse: mockTraverse,
  rotation: { y: 0 },
};

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(function MockWebGLRenderer() { return mockRenderer; }),
  Scene: vi.fn(function MockScene() { return mockScene; }),
  PerspectiveCamera: vi.fn(function MockPerspectiveCamera() { return mockCamera; }),
  AmbientLight: vi.fn(function MockAmbientLight() { return mockAmbientLight; }),
  DirectionalLight: vi.fn(function MockDirectionalLight() { return mockDirLight; }),
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn(function MockGLTFLoader() { return mockGLTFLoader; }),
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(function MockOrbitControls() { return mockControls; }),
}));

// ── ResizeObserver mock ───────────────────────────────────────────────────────

class MockResizeObserver {
  observe = mockResizeObserverObserve;
  disconnect = mockResizeObserverDisconnect;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simulate a successful GLTFLoader.load() call by invoking the onLoad callback.
 */
function resolveLoad() {
  const loadCall = (mockLoaderLoad as Mock).mock.calls[0];
  const onLoadCallback = loadCall?.[1] as ((gltf: { scene: typeof mockLoadedObject }) => void) | undefined;
  if (onLoadCallback) {
    act(() => {
      onLoadCallback({ scene: mockLoadedObject });
    });
  }
}

/**
 * Simulate a GLTFLoader.load() error by invoking the onError callback.
 */
function rejectLoad(err: Error = new Error('GLTFLoader internal error')) {
  const loadCall = (mockLoaderLoad as Mock).mock.calls[0];
  const onErrorCallback = loadCall?.[3] as ((e: unknown) => void) | undefined;
  if (onErrorCallback) {
    act(() => {
      onErrorCallback(err);
    });
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.cancelAnimationFrame = mockCancelAnimationFrame;
  // By default loader does NOT auto-resolve — each test controls this
  mockLoaderLoad.mockImplementation(function () { return undefined; });
});

afterAll(() => {
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Model3DViewer', () => {
  it('renders canvas element with correct data-testid', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    expect(screen.getByTestId('model3d-canvas')).toBeInTheDocument();
  });

  it('shows loading spinner initially', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    expect(screen.getByTestId('model3d-loading')).toBeInTheDocument();
  });

  it('hides loading spinner after model loads', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    resolveLoad();
    await waitFor(() =>
      expect(screen.queryByTestId('model3d-loading')).not.toBeInTheDocument(),
    );
  });

  it('shows error state when GLTFLoader fails', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    rejectLoad();
    await waitFor(() =>
      expect(screen.getByTestId('model3d-error')).toBeInTheDocument(),
    );
  });

  it('error state does NOT contain raw error message strings', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    rejectLoad(new Error('GLTFLoader internal error: unexpected token'));
    await waitFor(() =>
      expect(screen.getByTestId('model3d-error')).toBeInTheDocument(),
    );
    const errorEl = screen.getByTestId('model3d-error');
    expect(errorEl.textContent).not.toContain('GLTFLoader internal error');
    expect(errorEl.textContent).not.toContain('unexpected token');
  });

  it('error state has data-testid="model3d-error"', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    rejectLoad();
    await waitFor(() =>
      expect(screen.getByTestId('model3d-error')).toBeInTheDocument(),
    );
  });

  it('calls onLoad callback when model loads successfully', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const handleLoad = vi.fn();
    render(<Model3DViewer src="model.glb" onLoad={handleLoad} />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    resolveLoad();
    await waitFor(() => expect(handleLoad).toHaveBeenCalledTimes(1));
  });

  it('calls onError callback when loading fails', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const handleError = vi.fn();
    render(<Model3DViewer src="model.glb" onError={handleError} />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    rejectLoad(new Error('network error'));
    await waitFor(() => expect(handleError).toHaveBeenCalledTimes(1));
    expect(handleError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('canvas has correct data-testid attribute', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const { container } = render(<Model3DViewer src="model.glb" />);
    const canvas = container.querySelector('[data-testid="model3d-canvas"]');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.tagName.toLowerCase()).toBe('canvas');
  });

  it('renderer is disposed on unmount (memory safety)', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const { unmount } = render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    resolveLoad();
    await waitFor(() =>
      expect(screen.queryByTestId('model3d-loading')).not.toBeInTheDocument(),
    );
    unmount();
    await waitFor(() => expect(mockDispose).toHaveBeenCalled());
  });

  it('animation frame is cancelled on unmount', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const { unmount } = render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    resolveLoad();
    await waitFor(() =>
      expect(screen.queryByTestId('model3d-loading')).not.toBeInTheDocument(),
    );
    unmount();
    await waitFor(() => expect(mockCancelAnimationFrame).toHaveBeenCalled());
  });

  it('OrbitControls disposed on unmount', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const { unmount } = render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    resolveLoad();
    await waitFor(() =>
      expect(screen.queryByTestId('model3d-loading')).not.toBeInTheDocument(),
    );
    unmount();
    await waitFor(() => expect(mockControlsDispose).toHaveBeenCalled());
  });

  it('ResizeObserver disconnected on unmount', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const { unmount } = render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(mockResizeObserverDisconnect).toHaveBeenCalled());
  });

  it('shows data-testid="model3d-unavailable" when THREE fails to import', async () => {
    // Simulate the unavailable state by making WebGLRenderer throw inside the
    // try/catch of initViewer (which sets state to 'unavailable').
    const { Model3DViewer } = await import('./Model3DViewer');
    const { WebGLRenderer } = await import('three');
    (WebGLRenderer as Mock).mockImplementationOnce(function () {
      throw new Error('WebGL not supported in this environment');
    });

    render(<Model3DViewer src="model.glb" />);
    await waitFor(
      () => expect(screen.getByTestId('model3d-unavailable')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.getByTestId('model3d-unavailable').textContent).toContain(
      '3D viewer is not available in this environment',
    );
  });

  it('component renders without crashing with minimal props (src only)', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    expect(() => render(<Model3DViewer src="https://example.com/model.glb" />)).not.toThrow();
    expect(screen.getByTestId('model3d-canvas')).toBeInTheDocument();
  });

  it('GLTFLoader called with correct src URL', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const testUrl = 'https://cdn.edusphere.dev/models/test.glb';
    render(<Model3DViewer src={testUrl} />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    const callArgs = (mockLoaderLoad as Mock).mock.calls[0];
    expect(callArgs?.[0]).toBe(testUrl);
  });

  it('loading spinner is not shown after error state', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    render(<Model3DViewer src="model.glb" />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    rejectLoad();
    await waitFor(() =>
      expect(screen.getByTestId('model3d-error')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('model3d-loading')).not.toBeInTheDocument();
  });

  it('onError receives an Error instance (not raw unknown)', async () => {
    const { Model3DViewer } = await import('./Model3DViewer');
    const handleError = vi.fn();
    render(<Model3DViewer src="model.glb" onError={handleError} />);
    await waitFor(() => expect(mockLoaderLoad).toHaveBeenCalled());
    // Simulate non-Error rejection (string)
    const loadCall = (mockLoaderLoad as Mock).mock.calls[0];
    const onErrorCallback = loadCall?.[3] as ((e: unknown) => void) | undefined;
    if (onErrorCallback) {
      act(() => { onErrorCallback('string error'); });
    }
    await waitFor(() => expect(handleError).toHaveBeenCalled());
    expect(handleError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Props {
  src: string;
  format?: string;
  className?: string;
  onLoad?: () => void;
  onError?: (err: Error) => void;
}

type ViewerState = 'loading' | 'ready' | 'error' | 'unavailable';

// Minimal typed interfaces for the Three.js objects we use.
// These are resolved at runtime via dynamic import; we avoid importing
// the 'three' package directly so the component degrades gracefully when
// the package is absent.

interface ThreeRenderer {
  setSize(w: number, h: number): void;
  setPixelRatio(r: number): void;
  render(scene: unknown, camera: unknown): void;
  dispose(): void;
  domElement: HTMLCanvasElement;
}

interface ThreeObject3D {
  traverse(cb: (child: ThreeObject3D) => void): void;
  geometry?: { dispose(): void };
  material?: ThreeMaterial | ThreeMaterial[];
  rotation: { y: number };
}

interface ThreeMaterial {
  dispose(): void;
  map?: { dispose(): void } | null;
}

interface ThreeControls {
  update(): void;
  dispose(): void;
}

interface ThreeGLTFResult {
  scene: ThreeObject3D;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function disposeMaterial(mat: ThreeMaterial): void {
  mat.map?.dispose();
  mat.dispose();
}

function disposeObject(obj: ThreeObject3D): void {
  obj.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
    } else if (child.material) {
      disposeMaterial(child.material);
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Model3DViewer({ src, className, onLoad, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewerState, setViewerState] = useState<ViewerState>('loading');

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const initViewer = useCallback(async (): Promise<(() => void) | undefined> => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    // Dynamic imports — fail gracefully if three is not installed
    let THREE: typeof import('three');
    let GLTFLoaderModule: { GLTFLoader: new () => { load(url: string, onLoad: (gltf: ThreeGLTFResult) => void, onProgress: undefined, onError: (e: unknown) => void): void } };
    let OrbitControlsModule: { OrbitControls: new (camera: unknown, domElement: HTMLElement) => ThreeControls };

    try {
      [THREE, GLTFLoaderModule, OrbitControlsModule] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js') as Promise<typeof GLTFLoaderModule>,
        import('three/examples/jsm/controls/OrbitControls.js') as Promise<typeof OrbitControlsModule>,
      ]);
    } catch {
      setViewerState('unavailable');
      return undefined;
    }

    const { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight } = THREE;

    // Scene setup
    const scene = new Scene();
    const camera = new PerspectiveCamera(
      45,
      canvas.clientWidth / Math.max(canvas.clientHeight, 1),
      0.1,
      1000,
    );
    camera.position.set(0, 1, 3);

    const renderer: ThreeRenderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lighting
    scene.add(new AmbientLight(0xffffff, 0.6));
    const dirLight = new DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Controls
    const controls: ThreeControls = new OrbitControlsModule.OrbitControls(camera, canvas);

    // Animation loop
    let rafId = 0;
    let modelRef: ThreeObject3D | null = null;

    function animate() {
      rafId = window.requestAnimationFrame(animate);
      if (modelRef) {
        modelRef.rotation.y += 0.005;
      }
      controls.update();
      renderer.render(scene, camera);
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      (camera as unknown as { aspect: number; updateProjectionMatrix(): void }).aspect = w / Math.max(h, 1);
      (camera as unknown as { updateProjectionMatrix(): void }).updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // Load model
    const loader = new GLTFLoaderModule.GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        modelRef = gltf.scene;
        scene.add(gltf.scene as unknown as Parameters<typeof scene.add>[0]);
        setViewerState('ready');
        onLoadRef.current?.();
        animate();
      },
      undefined,
      (loadErr) => {
        const err = loadErr instanceof Error ? loadErr : new Error('Failed to load 3D model');
        setViewerState('error');
        onErrorRef.current?.(err);
        window.cancelAnimationFrame(rafId);
      },
    );

    // Cleanup
    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      if (modelRef) disposeObject(modelRef);
      renderer.dispose();
    };
  }, [src]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initViewer().then((cleanupFn) => {
      cleanup = cleanupFn;
    }).catch(() => {
      setViewerState('unavailable');
    });

    return () => {
      cleanup?.();
    };
  }, [initViewer]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden ${className ?? ''}`}
    >
      <canvas
        ref={canvasRef}
        data-testid="model3d-canvas"
        className="w-full h-full"
      />

      {viewerState === 'loading' && (
        <div
          data-testid="model3d-loading"
          className="absolute inset-0 flex items-center justify-center bg-gray-900/80"
        >
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400" />
        </div>
      )}

      {viewerState === 'error' && (
        <div
          data-testid="model3d-error"
          className="absolute inset-0 flex items-center justify-center bg-gray-900/90 p-4"
        >
          <p className="text-red-400 text-sm text-center">
            Unable to load the 3D model. Please check your connection and try again.
          </p>
        </div>
      )}

      {viewerState === 'unavailable' && (
        <div
          data-testid="model3d-unavailable"
          className="absolute inset-0 flex items-center justify-center bg-gray-900/90 p-4"
        >
          <p className="text-gray-400 text-sm text-center">
            3D viewer is not available in this environment
          </p>
        </div>
      )}
    </div>
  );
}

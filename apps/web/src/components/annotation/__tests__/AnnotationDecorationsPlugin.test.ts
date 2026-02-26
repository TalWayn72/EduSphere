import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationLayer } from '@/types/annotations';

// Mock all ProseMirror/Tiptap imports (aliased to stub in vitest.config.ts).
// Plugin and PluginKey are used with `new` in production code, so their mocks
// must be constructable — use function expressions, not arrow functions.
vi.mock('@tiptap/pm/state', () => ({
  Plugin: vi.fn(function (
    this: Record<string, unknown>,
    config: Record<string, unknown>
  ) {
    Object.assign(this, config);
    (this as Record<string, unknown>).isPlugin = true;
  }),
  PluginKey: vi.fn(function (this: Record<string, unknown>, name: string) {
    this.name = name;
    this.getState = vi.fn();
  }),
}));

vi.mock('@tiptap/pm/view', () => {
  const decorations: Array<{
    from: number;
    to: number;
    attrs: Record<string, string>;
  }> = [];
  return {
    Decoration: {
      inline: vi.fn((from, to, attrs) => {
        const d = { from, to, attrs };
        decorations.push(d);
        return d;
      }),
    },
    DecorationSet: {
      create: vi.fn((_, decs) => ({ decorations: decs })),
      empty: { decorations: [] },
    },
    __decorations: decorations,
  };
});

vi.mock('@tiptap/pm/model', () => ({
  Node: vi.fn(),
}));

vi.mock('@tiptap/core', () => ({
  Extension: {
    create: vi.fn((config) => ({ ...config, isExtension: true })),
  },
}));

describe('createAnnotationDecorationsPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates plugin with correct key', async () => {
    const { createAnnotationDecorationsPlugin, annotationPluginKey } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const plugin = createAnnotationDecorationsPlugin(
      () => [],
      () => null
    );
    expect(plugin).toBeDefined();
    expect(annotationPluginKey).toBeDefined();
  });

  it('builds empty DecorationSet when no annotations', async () => {
    const { DecorationSet } = await import('@tiptap/pm/view');
    const { createAnnotationDecorationsPlugin } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const mockDoc = { content: { size: 1000 } };
    const plugin = createAnnotationDecorationsPlugin(
      () => [],
      () => null
    );
    // Call init
    plugin.state?.init?.({} as never, { doc: mockDoc } as never);
    expect(DecorationSet.create).toHaveBeenCalledWith(mockDoc, []);
  });

  it('creates decorations for valid annotations', async () => {
    const { Decoration, DecorationSet } = await import('@tiptap/pm/view');
    const { createAnnotationDecorationsPlugin } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const mockDoc = { content: { size: 1000 } };
    const annotations = [
      {
        id: 'ann-1',
        layer: AnnotationLayer.PERSONAL,
        textRange: { from: 10, to: 50 },
      },
      {
        id: 'ann-2',
        layer: AnnotationLayer.SHARED,
        textRange: { from: 100, to: 150 },
      },
    ];
    const plugin = createAnnotationDecorationsPlugin(
      () => annotations,
      () => null
    );
    plugin.state?.init?.({} as never, { doc: mockDoc } as never);
    expect(Decoration.inline).toHaveBeenCalledTimes(2);
    expect(DecorationSet.create).toHaveBeenCalled();
  });

  it('skips annotations where from >= to', async () => {
    const { Decoration } = await import('@tiptap/pm/view');
    const { createAnnotationDecorationsPlugin } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const mockDoc = { content: { size: 1000 } };
    const annotations = [
      {
        id: 'bad-1',
        layer: AnnotationLayer.PERSONAL,
        textRange: { from: 50, to: 10 },
      },
      {
        id: 'bad-2',
        layer: AnnotationLayer.SHARED,
        textRange: { from: 30, to: 30 },
      },
    ];
    vi.mocked(Decoration.inline).mockClear();
    const plugin = createAnnotationDecorationsPlugin(
      () => annotations,
      () => null
    );
    plugin.state?.init?.({} as never, { doc: mockDoc } as never);
    expect(Decoration.inline).not.toHaveBeenCalled();
  });

  it('adds focused class to focused annotation', async () => {
    const { Decoration } = await import('@tiptap/pm/view');
    const { createAnnotationDecorationsPlugin } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const mockDoc = { content: { size: 1000 } };
    const annotations = [
      {
        id: 'ann-focus',
        layer: AnnotationLayer.INSTRUCTOR,
        textRange: { from: 5, to: 20 },
      },
    ];
    vi.mocked(Decoration.inline).mockClear();
    const plugin = createAnnotationDecorationsPlugin(
      () => annotations,
      () => 'ann-focus'
    );
    plugin.state?.init?.({} as never, { doc: mockDoc } as never);
    expect(Decoration.inline).toHaveBeenCalledWith(
      5,
      20,
      expect.objectContaining({
        class: expect.stringContaining('annotation-highlight--focused'),
      })
    );
  });

  it('clamps out-of-bounds positions to document size', async () => {
    const { Decoration } = await import('@tiptap/pm/view');
    const { createAnnotationDecorationsPlugin } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    const mockDoc = { content: { size: 100 } };
    const annotations = [
      {
        id: 'oob',
        layer: AnnotationLayer.PERSONAL,
        textRange: { from: -10, to: 999 },
      },
    ];
    vi.mocked(Decoration.inline).mockClear();
    const plugin = createAnnotationDecorationsPlugin(
      () => annotations,
      () => null
    );
    plugin.state?.init?.({} as never, { doc: mockDoc } as never);
    // Should be clamped to [0, 100]
    expect(Decoration.inline).toHaveBeenCalledWith(0, 100, expect.any(Object));
  });

  it('creates extension with addProseMirrorPlugins', async () => {
    const { Extension } = await import('@tiptap/core');
    const { createAnnotationExtension } =
      await import('@/components/annotation/AnnotationDecorationsPlugin');
    createAnnotationExtension(
      () => [],
      () => null
    );
    expect(Extension.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'annotationDecorations' })
    );
  });
});

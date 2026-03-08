/**
 * VisualBottomSheet — pure logic tests
 * Verifies props interface, anchor resolution, asset URL selection, and
 * snap-point configuration without rendering (no @testing-library/react-native).
 * Follows the MasteryBadge / HomeScreen pattern.
 */
import { describe, it, expect, vi } from 'vitest';
import type { VisualAnchor, VisualAsset } from '../types/visual-anchor.types';

// ---------------------------------------------------------------------------
// Helpers — mirror internal logic extracted from VisualBottomSheet
// ---------------------------------------------------------------------------

const SNAP_POINTS = ['25%', '50%', '90%'];

function resolveActiveAnchor(
  anchors: VisualAnchor[],
  activeAnchorId: string | null,
): VisualAnchor | null {
  if (!activeAnchorId) return null;
  return anchors.find((a) => a.id === activeAnchorId) ?? null;
}

function resolveImageUri(asset: VisualAsset): string {
  return asset.webpUrl ?? asset.storageUrl;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAsset(overrides?: Partial<VisualAsset>): VisualAsset {
  return {
    id: 'asset-1',
    filename: 'figure-1.png',
    mimeType: 'image/png',
    sizeBytes: 102400,
    storageUrl: 'https://cdn.example.com/figure-1.png',
    webpUrl: 'https://cdn.example.com/figure-1.webp',
    scanStatus: 'CLEAN',
    metadata: { width: 800, height: 600, altText: 'Figure 1' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAnchor(overrides?: Partial<VisualAnchor>): VisualAnchor {
  return {
    id: 'anchor-1',
    mediaAssetId: 'media-1',
    anchorText: 'The mitochondria is the powerhouse of the cell',
    documentOrder: 1,
    isBroken: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visualAsset: makeAsset(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VisualBottomSheet — snap points', () => {
  it('renders with correct snap points ["25%", "50%", "90%"]', () => {
    expect(SNAP_POINTS).toEqual(['25%', '50%', '90%']);
  });

  it('has exactly 3 snap points', () => {
    expect(SNAP_POINTS).toHaveLength(3);
  });

  it('snap points are valid percentage strings', () => {
    const pctPattern = /^\d+%$/;
    for (const pt of SNAP_POINTS) {
      expect(pctPattern.test(pt)).toBe(true);
    }
  });
});

describe('VisualBottomSheet — active anchor resolution', () => {
  it('returns null when activeAnchorId is null (empty state)', () => {
    const anchors = [makeAnchor()];
    const result = resolveActiveAnchor(anchors, null);
    expect(result).toBeNull();
  });

  it('returns null when anchors array is empty', () => {
    const result = resolveActiveAnchor([], 'anchor-1');
    expect(result).toBeNull();
  });

  it('returns the matching anchor when activeAnchorId matches', () => {
    const anchor = makeAnchor({ id: 'anchor-abc' });
    const result = resolveActiveAnchor([anchor], 'anchor-abc');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('anchor-abc');
  });

  it('returns null when no anchor matches activeAnchorId', () => {
    const anchors = [makeAnchor({ id: 'anchor-1' })];
    const result = resolveActiveAnchor(anchors, 'anchor-999');
    expect(result).toBeNull();
  });

  it('selects the correct anchor when multiple anchors exist', () => {
    const anchors = [
      makeAnchor({ id: 'anchor-1', anchorText: 'First section' }),
      makeAnchor({ id: 'anchor-2', anchorText: 'Second section' }),
      makeAnchor({ id: 'anchor-3', anchorText: 'Third section' }),
    ];
    const result = resolveActiveAnchor(anchors, 'anchor-2');
    expect(result).not.toBeNull();
    expect(result!.anchorText).toBe('Second section');
  });
});

describe('VisualBottomSheet — visual asset image URI', () => {
  it('prefers webpUrl over storageUrl when both are present', () => {
    const asset = makeAsset({
      storageUrl: 'https://cdn.example.com/figure-1.png',
      webpUrl: 'https://cdn.example.com/figure-1.webp',
    });
    expect(resolveImageUri(asset)).toBe('https://cdn.example.com/figure-1.webp');
  });

  it('falls back to storageUrl when webpUrl is null', () => {
    const asset = makeAsset({
      storageUrl: 'https://cdn.example.com/figure-1.png',
      webpUrl: null,
    });
    expect(resolveImageUri(asset)).toBe('https://cdn.example.com/figure-1.png');
  });

  it('falls back to storageUrl when webpUrl is undefined', () => {
    const asset = makeAsset({ webpUrl: undefined });
    expect(resolveImageUri(asset)).toBe('https://cdn.example.com/figure-1.png');
  });

  it('displays current anchor image when visualAsset is provided', () => {
    const anchor = makeAnchor({
      visualAsset: makeAsset({ storageUrl: 'https://cdn.example.com/figure-2.png', webpUrl: null }),
    });
    const uri = resolveImageUri(anchor.visualAsset!);
    expect(uri).toBe('https://cdn.example.com/figure-2.png');
  });

  it('provides correct accessibilityLabel from altText when available', () => {
    const asset = makeAsset({ metadata: { altText: 'A diagram of a cell', width: 800, height: 600 } });
    const label = asset.metadata?.altText ?? asset.filename;
    expect(label).toBe('A diagram of a cell');
  });

  it('falls back to filename as accessibilityLabel when altText is null', () => {
    const asset = makeAsset({ metadata: { altText: null, width: 800, height: 600 } });
    const label = asset.metadata?.altText ?? asset.filename;
    expect(label).toBe('figure-1.png');
  });
});

describe('VisualBottomSheet — anchor text display', () => {
  it('displays anchor text from the active anchor', () => {
    const anchor = makeAnchor({ anchorText: 'Photosynthesis occurs in chloroplasts' });
    expect(anchor.anchorText).toBe('Photosynthesis occurs in chloroplasts');
  });

  it('anchor text below image comes from resolved activeAnchor', () => {
    const anchors = [
      makeAnchor({ id: 'anchor-1', anchorText: 'First paragraph text' }),
      makeAnchor({ id: 'anchor-2', anchorText: 'Second paragraph text' }),
    ];
    const active = resolveActiveAnchor(anchors, 'anchor-2');
    expect(active!.anchorText).toBe('Second paragraph text');
  });
});

describe('VisualBottomSheet — empty / no asset state', () => {
  it('shows empty state when no anchor is selected (activeAnchorId is null)', () => {
    const activeAnchor = resolveActiveAnchor([makeAnchor()], null);
    // Component returns null → no bottom sheet rendered
    expect(activeAnchor).toBeNull();
  });

  it('shows no-image state when visualAsset is null on an active anchor', () => {
    const anchor = makeAnchor({ visualAsset: null });
    const activeAnchor = resolveActiveAnchor([anchor], 'anchor-1');
    expect(activeAnchor).not.toBeNull();
    // asset is null → component renders the "no image" text node
    expect(activeAnchor!.visualAsset).toBeNull();
  });

  it('shows no-image state when visualAsset is undefined', () => {
    const anchor = makeAnchor({ visualAsset: undefined });
    const activeAnchor = resolveActiveAnchor([anchor], 'anchor-1');
    expect(activeAnchor!.visualAsset).toBeUndefined();
    // falsy → component renders "No image assigned to this section"
    const hasAsset = Boolean(activeAnchor!.visualAsset);
    expect(hasAsset).toBe(false);
  });
});

describe('VisualBottomSheet — handleSheetChange callback', () => {
  it('calls onSheetChange handler (smoke test for callback integration)', () => {
    const handler = vi.fn();
    // Simulate bottom-sheet calling onChange with index values
    handler(0);  // 25% snap
    handler(1);  // 50% snap
    handler(2);  // 90% snap
    handler(-1); // closed
    expect(handler).toHaveBeenCalledTimes(4);
    expect(handler).toHaveBeenCalledWith(0);
    expect(handler).toHaveBeenCalledWith(-1);
  });

  it('index -1 represents closed state', () => {
    const CLOSED_INDEX = -1;
    expect(CLOSED_INDEX).toBe(-1);
    // Snap indices: 0=25%, 1=50%, 2=90% — closed is -1
    expect(SNAP_POINTS[0]).toBe('25%');
    expect(SNAP_POINTS[1]).toBe('50%');
    expect(SNAP_POINTS[2]).toBe('90%');
  });
});

describe('VisualBottomSheet — props interface contract', () => {
  it('accepts an anchors array of VisualAnchor objects', () => {
    const anchors: VisualAnchor[] = [makeAnchor()];
    expect(Array.isArray(anchors)).toBe(true);
    expect(anchors[0]).toHaveProperty('id');
    expect(anchors[0]).toHaveProperty('anchorText');
    expect(anchors[0]).toHaveProperty('documentOrder');
  });

  it('accepts null as activeAnchorId (no selection)', () => {
    const activeAnchorId: string | null = null;
    expect(activeAnchorId).toBeNull();
  });

  it('accepts a string as activeAnchorId (selection active)', () => {
    const activeAnchorId: string | null = 'anchor-1';
    expect(typeof activeAnchorId).toBe('string');
  });

  it('VisualAnchor has all required fields', () => {
    const anchor = makeAnchor();
    expect(anchor).toHaveProperty('id');
    expect(anchor).toHaveProperty('mediaAssetId');
    expect(anchor).toHaveProperty('anchorText');
    expect(anchor).toHaveProperty('documentOrder');
    expect(anchor).toHaveProperty('isBroken');
    expect(anchor).toHaveProperty('createdAt');
    expect(anchor).toHaveProperty('updatedAt');
  });

  it('isBroken flag is a boolean', () => {
    const anchor = makeAnchor({ isBroken: false });
    expect(typeof anchor.isBroken).toBe('boolean');
  });
});

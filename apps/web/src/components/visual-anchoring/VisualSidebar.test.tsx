import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import VisualSidebar from './VisualSidebar';
import type { VisualAnchor } from './visual-anchor.types';

// Mock CrossFadeImage to isolate VisualSidebar logic
vi.mock('./CrossFadeImage', () => ({
  default: ({
    src,
    alt,
  }: {
    src: string | null;
    alt?: string;
  }) => (
    <img
      data-testid="cross-fade-image"
      src={src ?? undefined}
      alt={alt}
    />
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeAnchor(overrides: Partial<VisualAnchor> = {}): VisualAnchor {
  return {
    id: 'anchor-1',
    mediaAssetId: 'media-1',
    anchorText: 'This is the anchor text',
    documentOrder: 0,
    isBroken: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    visualAsset: null,
    ...overrides,
  };
}

function makeAsset() {
  return {
    id: 'asset-1',
    filename: 'diagram.webp',
    mimeType: 'image/webp',
    sizeBytes: 12000,
    storageUrl: 'https://cdn.example.com/diagram.png',
    webpUrl: 'https://cdn.example.com/diagram.webp',
    scanStatus: 'CLEAN' as const,
    metadata: { altText: 'A helpful diagram', width: 400, height: 300 },
    createdAt: '2024-01-01T00:00:00Z',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VisualSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when activeAnchorId is null', () => {
    render(
      <VisualSidebar
        anchors={[makeAnchor()]}
        activeAnchorId={null}
      />
    );
    expect(screen.getByTestId('sidebar-empty-state')).toBeDefined();
    expect(screen.queryByTestId('sidebar-no-image')).toBeNull();
    expect(screen.queryByTestId('cross-fade-image')).toBeNull();
  });

  it('shows empty state when anchors list is empty and activeAnchorId is null', () => {
    render(<VisualSidebar anchors={[]} activeAnchorId={null} />);
    expect(screen.getByTestId('sidebar-empty-state')).toBeDefined();
  });

  it('shows "No image assigned" when anchor has no visualAsset', () => {
    const anchor = makeAnchor({ id: 'a1', visualAsset: null });
    render(
      <VisualSidebar anchors={[anchor]} activeAnchorId="a1" />
    );
    expect(screen.getByTestId('sidebar-no-image')).toBeDefined();
    expect(screen.queryByTestId('cross-fade-image')).toBeNull();
  });

  it('renders CrossFadeImage with webpUrl when anchor has visualAsset', () => {
    const asset = makeAsset();
    const anchor = makeAnchor({ id: 'a1', visualAsset: asset });
    render(
      <VisualSidebar anchors={[anchor]} activeAnchorId="a1" />
    );
    const img = screen.getByTestId('cross-fade-image') as HTMLImageElement;
    expect(img).toBeDefined();
    // Prefers webpUrl over storageUrl
    expect(img.src).toBe('https://cdn.example.com/diagram.webp');
    expect(img.alt).toBe('A helpful diagram');
  });

  it('falls back to storageUrl when webpUrl is null', () => {
    const asset = { ...makeAsset(), webpUrl: null };
    const anchor = makeAnchor({ id: 'a1', visualAsset: asset });
    render(
      <VisualSidebar anchors={[anchor]} activeAnchorId="a1" />
    );
    const img = screen.getByTestId('cross-fade-image') as HTMLImageElement;
    expect(img.src).toBe('https://cdn.example.com/diagram.png');
  });

  it('shows anchor text in footer when active anchor is set', () => {
    const anchor = makeAnchor({ id: 'a1', anchorText: 'Important section text' });
    render(
      <VisualSidebar anchors={[anchor]} activeAnchorId="a1" />
    );
    expect(screen.getByText(/Important section text/)).toBeDefined();
  });

  it('does not render footer when activeAnchorId is null', () => {
    const anchor = makeAnchor({ anchorText: 'Should not appear' });
    render(
      <VisualSidebar anchors={[anchor]} activeAnchorId={null} />
    );
    expect(screen.queryByText(/Should not appear/)).toBeNull();
  });

  it('renders with border-l class for RTL layout', () => {
    render(
      <VisualSidebar anchors={[]} activeAnchorId={null} isRTL={true} />
    );
    const sidebar = screen.getByTestId('visual-sidebar');
    expect(sidebar.className).toContain('border-l');
    expect(sidebar.className).not.toContain('border-r');
  });

  it('renders with border-r class for LTR layout (default)', () => {
    render(
      <VisualSidebar anchors={[]} activeAnchorId={null} isRTL={false} />
    );
    const sidebar = screen.getByTestId('visual-sidebar');
    expect(sidebar.className).toContain('border-r');
    expect(sidebar.className).not.toContain('border-l');
  });

  it('has data-testid="visual-sidebar" on root element', () => {
    render(<VisualSidebar anchors={[]} activeAnchorId={null} />);
    expect(screen.getByTestId('visual-sidebar')).toBeDefined();
  });

  it('has role=complementary and aria-label on root element', () => {
    render(<VisualSidebar anchors={[]} activeAnchorId={null} />);
    const sidebar = screen.getByRole('complementary', { name: 'Visual Aid Sidebar' });
    expect(sidebar).toBeDefined();
  });
});

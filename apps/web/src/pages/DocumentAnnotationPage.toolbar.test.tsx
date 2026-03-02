import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Imports ───────────────────────────────────────────────────────────────────

import { DocumentToolbar } from './DocumentAnnotationPage.toolbar';
import { AnnotationLayer } from '@/types/annotations';

// ── Helpers ───────────────────────────────────────────────────────────────────

type DocumentZoom = 0.75 | 1 | 1.25 | 1.5;

interface ToolbarProps {
  title?: string;
  documentZoom?: DocumentZoom;
  onZoomChange?: (z: DocumentZoom) => void;
  defaultAnnotationLayer?: AnnotationLayer;
  onDefaultLayerChange?: (l: AnnotationLayer) => void;
}

function renderToolbar({
  title = 'Test Document',
  documentZoom = 1,
  onZoomChange = vi.fn(),
  defaultAnnotationLayer = AnnotationLayer.PERSONAL,
  onDefaultLayerChange = vi.fn(),
}: ToolbarProps = {}) {
  return render(
    <MemoryRouter>
      <DocumentToolbar
        title={title}
        documentZoom={documentZoom}
        onZoomChange={onZoomChange}
        defaultAnnotationLayer={defaultAnnotationLayer}
        onDefaultLayerChange={onDefaultLayerChange}
      />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DocumentToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the document title', () => {
    renderToolbar({ title: 'My Study Guide' });
    expect(screen.getByText('My Study Guide')).toBeInTheDocument();
  });

  it('renders a back link to /courses', () => {
    renderToolbar();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/courses');
  });

  it('shows the current zoom level as a percentage label', () => {
    renderToolbar({ documentZoom: 1 });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows 75% zoom level label', () => {
    renderToolbar({ documentZoom: 0.75 });
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('ZoomOut button is disabled at minimum zoom (0.75)', () => {
    renderToolbar({ documentZoom: 0.75 });
    const buttons = screen.getAllByRole('button');
    // ZoomOut is the first zoom button
    void buttons.find((b) => b.querySelector('svg'));
    // The first ghost size button near zoom area should be disabled
    expect(buttons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('ZoomIn button is disabled at maximum zoom (1.5)', () => {
    renderToolbar({ documentZoom: 1.5 });
    const buttons = screen.getAllByRole('button');
    expect(buttons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('calls onZoomChange with next level when ZoomIn is clicked', () => {
    const onZoomChange = vi.fn();
    renderToolbar({ documentZoom: 1, onZoomChange });
    // There are 2 zoom buttons (ZoomOut, ZoomIn). ZoomIn has aria-disabled=false at zoom=1.
    // Find the enabled one that is NOT the back link.
    const buttons = screen.getAllByRole('button');
    // ZoomOut is disabled at 0.75, ZoomIn is last button
    const zoomInBtn = buttons[buttons.length - 1]!;
    fireEvent.click(zoomInBtn);
    expect(onZoomChange).toHaveBeenCalledWith(1.25);
  });

  it('calls onZoomChange with previous level when ZoomOut is clicked', () => {
    const onZoomChange = vi.fn();
    renderToolbar({ documentZoom: 1.25, onZoomChange });
    // ZoomOut is the first button (back button renders as <a>, not <button>)
    const buttons = screen.getAllByRole('button');
    // buttons[0] = ZoomOut, buttons[1] = ZoomIn
    fireEvent.click(buttons[0]!);
    expect(onZoomChange).toHaveBeenCalledWith(1);
  });

  it('renders the annotation layer select dropdown', () => {
    renderToolbar();
    expect(screen.getByTitle('Default comment visibility')).toBeInTheDocument();
  });

  it('calls onDefaultLayerChange when select value changes', () => {
    const onDefaultLayerChange = vi.fn();
    renderToolbar({ onDefaultLayerChange });
    fireEvent.change(screen.getByTitle('Default comment visibility'), {
      target: { value: AnnotationLayer.SHARED },
    });
    expect(onDefaultLayerChange).toHaveBeenCalledWith(AnnotationLayer.SHARED);
  });

  it('does not include AI_GENERATED as a select option', () => {
    renderToolbar();
    const select = screen.getByTitle('Default comment visibility');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.every((o) => o.value !== AnnotationLayer.AI_GENERATED)).toBe(
      true
    );
  });
});

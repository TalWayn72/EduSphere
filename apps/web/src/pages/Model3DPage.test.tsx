import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

const Model3DViewerMock = vi.fn(
  ({ src, className }: { src: string; className: string }) => (
    <div data-testid="model3d-viewer" data-src={src} className={className} />
  )
);

vi.mock('@/components/Model3DViewer', () => ({
  Model3DViewer: (props: Record<string, unknown>) =>
    Model3DViewerMock(props as never),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { Model3DPage } from './Model3DPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(assetId = 'abc123') {
  return render(
    <MemoryRouter initialEntries={[`/model3d/${assetId}`]}>
      <Routes>
        <Route path="/model3d/:assetId" element={<Model3DPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Model3DPage', () => {
  it('renders heading "3D Model Viewer"', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /3d model viewer/i })
    ).toBeInTheDocument();
  });

  it('passes correct src derived from assetId to Model3DViewer', () => {
    renderPage('my-asset-42');
    const viewer = screen.getByTestId('model3d-viewer');
    expect(viewer).toHaveAttribute('data-src', '/api/assets/my-asset-42/model');
  });

  it('renders within PageShell', () => {
    renderPage();
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
  });

  it('renders Model3DViewer with h-96 class', () => {
    renderPage();
    const viewer = screen.getByTestId('model3d-viewer');
    expect(viewer.className).toContain('h-96');
  });

  it('defaults assetId to empty string when param missing', () => {
    render(
      <MemoryRouter initialEntries={['/model3d/']}>
        <Routes>
          <Route path="/model3d/" element={<Model3DPage />} />
        </Routes>
      </MemoryRouter>
    );
    const viewer = screen.getByTestId('model3d-viewer');
    expect(viewer).toHaveAttribute('data-src', '/api/assets//model');
  });
});

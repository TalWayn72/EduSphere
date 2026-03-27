/**
 * Tests for PDF barrel file (index.ts) — verifies all public exports exist.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock pdfjs-dist since PdfViewer imports it at module level
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}));

describe('pdf/index barrel exports', () => {
  it('exports PdfViewer component', async () => {
    const mod = await import('./index');
    expect(mod.PdfViewer).toBeDefined();
    expect(typeof mod.PdfViewer).toBe('function');
  });

  it('exports PdfAnnotationLayer component', async () => {
    const mod = await import('./index');
    expect(mod.PdfAnnotationLayer).toBeDefined();
    expect(typeof mod.PdfAnnotationLayer).toBe('function');
  });

  it('exports PdfSketchOverlay component', async () => {
    const mod = await import('./index');
    expect(mod.PdfSketchOverlay).toBeDefined();
    expect(typeof mod.PdfSketchOverlay).toBe('function');
  });

  it('exports PdfDocumentViewer component', async () => {
    const mod = await import('./index');
    expect(mod.PdfDocumentViewer).toBeDefined();
    expect(typeof mod.PdfDocumentViewer).toBe('function');
  });

  it('exports PdfToolbar component', async () => {
    const mod = await import('./index');
    expect(mod.PdfToolbar).toBeDefined();
    expect(typeof mod.PdfToolbar).toBe('function');
  });

  it('exports all 5 components from barrel', async () => {
    const mod = await import('./index');
    const exportedNames = Object.keys(mod);
    expect(exportedNames).toContain('PdfViewer');
    expect(exportedNames).toContain('PdfAnnotationLayer');
    expect(exportedNames).toContain('PdfSketchOverlay');
    expect(exportedNames).toContain('PdfDocumentViewer');
    expect(exportedNames).toContain('PdfToolbar');
  });
});

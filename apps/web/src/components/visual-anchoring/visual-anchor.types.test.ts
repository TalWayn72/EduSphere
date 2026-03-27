/**
 * Tests for visual-anchor.types.ts — verifies type exports are usable at runtime.
 */
import { describe, it, expect } from 'vitest';
import type {
  VisualAsset,
  VisualAnchor,
  SelectionInfo,
  UploadStatus,
} from './visual-anchor.types';

describe('visual-anchor.types', () => {
  it('VisualAsset type is structurally valid', () => {
    const asset: VisualAsset = {
      id: 'asset-1',
      filename: 'test.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      storageUrl: 'https://storage.example.com/test.png',
      scanStatus: 'CLEAN',
      metadata: { width: 800, height: 600, altText: 'Test image' },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(asset.id).toBe('asset-1');
    expect(asset.scanStatus).toBe('CLEAN');
  });

  it('VisualAsset allows optional fields to be null', () => {
    const asset: VisualAsset = {
      id: 'asset-2',
      filename: 'test.png',
      mimeType: 'image/png',
      sizeBytes: 512,
      storageUrl: 'https://storage.example.com/test.png',
      webpUrl: null,
      scanStatus: 'PENDING',
      metadata: { width: null, height: null, altText: null },
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(asset.webpUrl).toBeNull();
    expect(asset.metadata.width).toBeNull();
  });

  it('VisualAnchor type is structurally valid', () => {
    const anchor: VisualAnchor = {
      id: 'anchor-1',
      mediaAssetId: 'media-1',
      anchorText: 'Important passage',
      documentOrder: 0,
      isBroken: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(anchor.id).toBe('anchor-1');
    expect(anchor.isBroken).toBe(false);
  });

  it('SelectionInfo type is structurally valid', () => {
    const selection: SelectionInfo = {
      text: 'selected text',
      pageNumber: 1,
      posX: 100,
      posY: 200,
      posW: 300,
      posH: 50,
      containerRect: new DOMRect(0, 0, 800, 600),
    };
    expect(selection.text).toBe('selected text');
    expect(selection.pageNumber).toBe(1);
  });

  it('UploadStatus type accepts all valid values', () => {
    const statuses: UploadStatus[] = [
      'idle',
      'uploading',
      'scanning',
      'success',
      'infected',
      'error',
    ];
    expect(statuses).toHaveLength(6);
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('VisualAsset scanStatus accepts all valid values', () => {
    const statuses: VisualAsset['scanStatus'][] = [
      'PENDING',
      'SCANNING',
      'CLEAN',
      'INFECTED',
      'ERROR',
    ];
    expect(statuses).toHaveLength(5);
  });
});

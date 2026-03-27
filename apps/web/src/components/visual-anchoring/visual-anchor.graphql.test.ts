/**
 * Tests for visual-anchor.graphql.ts — verifies GraphQL document exports.
 */
import { describe, it, expect } from 'vitest';
import {
  GET_VISUAL_ANCHORS,
  GET_VISUAL_ASSETS,
  CREATE_VISUAL_ANCHOR,
  DELETE_VISUAL_ANCHOR,
  ASSIGN_ASSET_TO_ANCHOR,
  CONFIRM_VISUAL_ASSET_UPLOAD,
  GET_PRESIGNED_UPLOAD_URL,
} from './visual-anchor.graphql';

describe('visual-anchor.graphql', () => {
  it('exports GET_VISUAL_ANCHORS query', () => {
    expect(GET_VISUAL_ANCHORS).toBeDefined();
    expect(GET_VISUAL_ANCHORS.kind).toBe('Document');
  });

  it('GET_VISUAL_ANCHORS contains mediaAssetId variable', () => {
    const source =
      GET_VISUAL_ANCHORS.loc?.source?.body ?? JSON.stringify(GET_VISUAL_ANCHORS);
    expect(source).toContain('mediaAssetId');
  });

  it('exports GET_VISUAL_ASSETS query', () => {
    expect(GET_VISUAL_ASSETS).toBeDefined();
    expect(GET_VISUAL_ASSETS.kind).toBe('Document');
  });

  it('exports CREATE_VISUAL_ANCHOR mutation', () => {
    expect(CREATE_VISUAL_ANCHOR).toBeDefined();
    expect(CREATE_VISUAL_ANCHOR.kind).toBe('Document');
  });

  it('exports DELETE_VISUAL_ANCHOR mutation', () => {
    expect(DELETE_VISUAL_ANCHOR).toBeDefined();
    expect(DELETE_VISUAL_ANCHOR.kind).toBe('Document');
  });

  it('exports ASSIGN_ASSET_TO_ANCHOR mutation', () => {
    expect(ASSIGN_ASSET_TO_ANCHOR).toBeDefined();
    expect(ASSIGN_ASSET_TO_ANCHOR.kind).toBe('Document');
  });

  it('exports CONFIRM_VISUAL_ASSET_UPLOAD mutation', () => {
    expect(CONFIRM_VISUAL_ASSET_UPLOAD).toBeDefined();
    expect(CONFIRM_VISUAL_ASSET_UPLOAD.kind).toBe('Document');
  });

  it('exports GET_PRESIGNED_UPLOAD_URL query', () => {
    expect(GET_PRESIGNED_UPLOAD_URL).toBeDefined();
    expect(GET_PRESIGNED_UPLOAD_URL.kind).toBe('Document');
  });
});

/**
 * Barrel re-export tests for visual-anchoring/index.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock urql used by graphql file and components
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
  ]),
}));

import * as barrel from './index';

describe('visual-anchoring/index barrel', () => {
  it('exports AnchorEditor', () => {
    expect(barrel.AnchorEditor).toBeDefined();
  });

  it('exports AssetUploader', () => {
    expect(barrel.AssetUploader).toBeDefined();
  });

  it('exports AssetPicker', () => {
    expect(barrel.AssetPicker).toBeDefined();
  });

  it('exports InstructorAnchorPanel', () => {
    expect(barrel.InstructorAnchorPanel).toBeDefined();
  });

  it('re-exports visual-anchor.types (VisualAsset, etc. are type-only)', () => {
    // Type-only exports don't exist at runtime, but the module should import without error
    expect(barrel).toBeDefined();
  });

  it('re-exports GraphQL documents', () => {
    expect(barrel.GET_VISUAL_ANCHORS).toBeDefined();
    expect(barrel.GET_VISUAL_ASSETS).toBeDefined();
    expect(barrel.CREATE_VISUAL_ANCHOR).toBeDefined();
    expect(barrel.DELETE_VISUAL_ANCHOR).toBeDefined();
    expect(barrel.ASSIGN_ASSET_TO_ANCHOR).toBeDefined();
    expect(barrel.CONFIRM_VISUAL_ASSET_UPLOAD).toBeDefined();
    expect(barrel.GET_PRESIGNED_UPLOAD_URL).toBeDefined();
  });
});

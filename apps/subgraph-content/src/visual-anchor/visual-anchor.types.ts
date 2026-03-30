import type { VisualAssetRow } from './visual-asset-upload.helper';

export type { VisualAssetRow };

export interface VisualAnchorRow {
  id: string;
  mediaAssetId: string;
  anchorText: string;
  pageNumber: number | null;
  posX: string | null;
  posY: string | null;
  posW: string | null;
  posH: string | null;
  pageEnd: number | null;
  posXEnd: string | null;
  posYEnd: string | null;
  visualAssetId: string | null;
  visualAsset: VisualAssetRow | null;
  documentOrder: number;
  isBroken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  synced: number;
  broken: number;
}

export interface VisualAssetSearchResult {
  asset: VisualAssetRow & { courseId: string; createdAt: string };
  anchorText: string | null;
  thumbnailUrl: string | null;
}

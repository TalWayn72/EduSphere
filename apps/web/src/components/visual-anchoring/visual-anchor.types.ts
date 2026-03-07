export interface VisualAsset {
  id: string;
  courseId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  webpUrl?: string | null;
  scanStatus: 'PENDING' | 'SCANNING' | 'CLEAN' | 'INFECTED' | 'ERROR';
  metadata: { width?: number | null; height?: number | null; altText?: string | null };
  createdAt: string;
}

export interface VisualAnchor {
  id: string;
  mediaAssetId: string;
  anchorText: string;
  pageNumber?: number | null;
  posX?: number | null;
  posY?: number | null;
  posW?: number | null;
  posH?: number | null;
  pageEnd?: number | null;
  posXEnd?: number | null;
  posYEnd?: number | null;
  visualAssetId?: string | null;
  visualAsset?: VisualAsset | null;
  documentOrder: number;
  isBroken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SelectionInfo {
  text: string;
  pageNumber: number;
  posX: number;
  posY: number;
  posW: number;
  posH: number;
  containerRect: DOMRect;
}

export type UploadStatus = 'idle' | 'uploading' | 'scanning' | 'success' | 'infected' | 'error';

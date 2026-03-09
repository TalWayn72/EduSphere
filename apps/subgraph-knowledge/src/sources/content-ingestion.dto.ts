/**
 * ContentIngestionResultDto — mirrors ContentIngestionResult in content-ingestion.graphql.
 * Used as return type for the ingestContent mutation resolver stub.
 */
export interface ContentIngestionResultDto {
  contentItemId: string;
  extractedText: string;
  aiCaption: string | null;
  isHandwritten: boolean;
  ocrMethod: OcrMethod;
  ocrConfidence: number;
  topics: string[];
  thumbnailUrl: string | null;
  estimatedDuration: number;
  pageCount: number | null;
  warnings: string[];
}

export type OcrMethod =
  | 'EMBEDDED_TEXT'
  | 'TESSERACT'
  | 'PADDLE'
  | 'TROCR'
  | 'MOONDREAM'
  | 'NONE';

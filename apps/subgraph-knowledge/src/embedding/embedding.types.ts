export interface EmbeddingRecord {
  id: string;
  type: 'content' | 'annotation' | 'concept';
  refId: string;
  embedding: number[];
  createdAt: string;
}

export interface SearchResult {
  id: string;
  refId: string;
  type: string;
  similarity: number;
}

export interface SegmentInput {
  id: string;
  text: string;
  transcriptId: string;
}

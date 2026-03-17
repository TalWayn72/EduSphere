// ─── API response types ───────────────────────────────────────────────────────
export interface ApiConcept {
  id: string;
  name: string;
  definition: string;
  sourceIds: string[];
}

export interface ApiRelatedConcept {
  concept: { id: string; name: string; definition: string };
  strength: number;
}

export interface ApiConceptNode {
  id: string;
  name: string;
  type?: string;
}

export interface ApiLearningPath {
  concepts: ApiConceptNode[];
  steps: number;
}

export type ViewMode = 'global' | 'personal';

export interface KnowledgeGraphProps {
  /** When provided, shows course-context breadcrumb and filters the graph */
  courseId?: string;
}

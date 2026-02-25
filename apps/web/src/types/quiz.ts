/**
 * Frontend quiz types — mirrors the Zod schemas in subgraph-content.
 * Used for type-safe quiz item component props.
 */

export type QuizItemType =
  | 'MULTIPLE_CHOICE'
  | 'DRAG_ORDER'
  | 'HOTSPOT'
  | 'MATCHING'
  | 'LIKERT'
  | 'FILL_BLANK';

export interface QuizOption {
  id: string;
  text: string;
}

export interface MultipleChoice {
  type: 'MULTIPLE_CHOICE';
  question: string;
  options: QuizOption[];
  correctOptionIds: string[];
  explanation?: string;
}

export interface DragOrder {
  type: 'DRAG_ORDER';
  question: string;
  items: QuizOption[];
  correctOrder: string[];
}

export interface HotspotPoint {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface Hotspot {
  type: 'HOTSPOT';
  question: string;
  imageUrl: string;
  hotspots: HotspotPoint[];
  correctHotspotIds: string[];
}

export interface Matching {
  type: 'MATCHING';
  question: string;
  leftItems: QuizOption[];
  rightItems: QuizOption[];
  correctPairs: Array<{ leftId: string; rightId: string }>;
}

export interface Likert {
  type: 'LIKERT';
  question: string;
  scale: number;
  labels?: { min: string; max: string };
}

export interface FillBlank {
  type: 'FILL_BLANK';
  question: string;
  correctAnswer: string;
  useSemanticMatching: boolean;
  similarityThreshold: number;
}

export type QuizItem =
  | MultipleChoice
  | DragOrder
  | Hotspot
  | Matching
  | Likert
  | FillBlank;

export interface QuizContent {
  items: QuizItem[];
  randomizeOrder: boolean;
  showExplanations: boolean;
  passingScore: number;
}

export interface QuizItemResult {
  itemIndex: number;
  correct: boolean;
  explanation?: string;
  partialScore?: number;
}

export interface QuizResult {
  id: string;
  score: number;
  passed: boolean;
  itemResults: QuizItemResult[];
  submittedAt: string;
}

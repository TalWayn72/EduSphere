/**
 * CAT Engine Types — shared interfaces for adaptive testing.
 */
import type { ExamItem } from '@edusphere/db';

export interface CatState {
  currentTheta: number;
  currentSE: number;
  administeredItemIds: string[];
  responsePattern: boolean[];
}

export interface TerminationResult {
  shouldTerminate: boolean;
  reason: string;
  theta: number;
  se: number;
}

export interface CatNextResult {
  item?: ExamItem;
  terminated: boolean;
  result?: TerminationResult;
}

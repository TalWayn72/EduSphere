/**
 * Types for the student-facing polished transcript reading view.
 *
 * Distinct from polished-transcript.types.ts which covers the instructor
 * track-changes review workflow. These types model the rendered article blocks
 * that students see after a transcript reaches DRAFT or PUBLISHED status.
 */

/** Block types for the student article reading view. */
export type PolishedBlockType =
  | 'POLISHED_TEXT'
  | 'POLISHED_CITATION'
  | 'POLISHED_HEADING';

export interface PolishedBlock {
  id: string;
  blockType: PolishedBlockType;
  /** Display text for this block. */
  text: string;
  /** Video timestamp in seconds — used for time-sync highlight and click-to-seek. */
  startTime?: number | null;
  endTime?: number | null;
}

export interface PolishedTranscriptPanelProps {
  blocks: PolishedBlock[];
  currentTime?: number;
  /** Called when user clicks a block — seeks video to block.startTime. */
  onSeek?: (time: number) => void;
  className?: string;
}

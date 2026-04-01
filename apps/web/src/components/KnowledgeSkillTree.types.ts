export type MasteryLevel =
  | 'none'
  | 'attempted'
  | 'familiar'
  | 'proficient'
  | 'mastered';

export interface SkillNode {
  id: string;
  label: string;
  mastery: MasteryLevel;
  progress: number; // 0-100
  children: string[]; // child node IDs
  unlocked: boolean;
}

export interface KnowledgeSkillTreeProps {
  nodes: SkillNode[];
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export interface LayoutNode extends SkillNode {
  x: number;
  y: number;
  depth: number;
}

// ── Icon map ──────────────────────────────────────────────────────────────────

export const MASTERY_ICON: Record<MasteryLevel, string> = {
  none: '\u25CB',
  attempted: '\u25D1',
  familiar: '\u{1F9E0}',
  proficient: '\u26A1',
  mastered: '\u2605',
};

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  none: 'No mastery',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

// ── Layout constants ─────────────────────────────────────────────────────────

export const NODE_W = 168;
export const NODE_H = 96;
export const H_GAP = 40;
export const V_GAP = 48;

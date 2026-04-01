/**
 * SkillTreePage helpers — mastery mapping, API types, and UUID validation.
 */
import type { SkillNode, MasteryLevel } from '@/components/KnowledgeSkillTree';

// ─── GraphQL response types ────────────────────────────────────────────────

export interface ApiSkillTreeNode {
  id: string;
  label: string;
  type: string;
  masteryLevel: string;
  connections: string[];
}

export interface ApiSkillTree {
  skillTree: {
    nodes: ApiSkillTreeNode[];
    edges: { source: string; target: string }[];
  };
}

// ─── Mastery level mapping (backend enum -> frontend literal) ──────────────

export const MASTERY_MAP: Record<string, MasteryLevel> = {
  NONE: 'none',
  ATTEMPTED: 'attempted',
  FAMILIAR: 'familiar',
  PROFICIENT: 'proficient',
  MASTERED: 'mastered',
};

export const REVERSE_MASTERY_MAP: Record<MasteryLevel, string> = {
  none: 'NONE',
  attempted: 'ATTEMPTED',
  familiar: 'FAMILIAR',
  proficient: 'PROFICIENT',
  mastered: 'MASTERED',
};

export const MASTERY_ORDER: MasteryLevel[] = [
  'none',
  'attempted',
  'familiar',
  'proficient',
  'mastered',
];

export function nextMastery(current: MasteryLevel): MasteryLevel {
  const idx = MASTERY_ORDER.indexOf(current);
  return MASTERY_ORDER[Math.min(idx + 1, MASTERY_ORDER.length - 1)] ?? current;
}

export function masteryToProgress(level: MasteryLevel): number {
  const map: Record<MasteryLevel, number> = {
    none: 0,
    attempted: 20,
    familiar: 60,
    proficient: 80,
    mastered: 100,
  };
  return map[level] ?? 0;
}

export function mapApiNodes(
  apiNodes: ApiSkillTreeNode[],
  localOverrides: Map<string, MasteryLevel>
): SkillNode[] {
  const allIds = new Set(apiNodes.map((n) => n.id));
  return apiNodes.map((n) => ({
    id: n.id,
    label: n.label,
    mastery: localOverrides.get(n.id) ?? MASTERY_MAP[n.masteryLevel] ?? 'none',
    progress: masteryToProgress(
      localOverrides.get(n.id) ?? MASTERY_MAP[n.masteryLevel] ?? 'none'
    ),
    children: n.connections.filter((id) => allIds.has(id)),
    unlocked: true,
  }));
}

// ─── UUID validation helper ────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidCourseId(id: string): boolean {
  return id === 'all' || UUID_REGEX.test(id);
}

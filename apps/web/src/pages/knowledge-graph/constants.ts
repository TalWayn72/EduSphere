import type React from 'react';
import type { GraphNode } from '@/lib/mock-graph-data';
import type { ApiLearningPath } from './types';

// ─── SVG layout constants ────────────────────────────────────────────────────
export const SVG_W = 520;
export const SVG_H = 380;
export const CX = 260;
export const CY = 195;
export const R = 155;

// ─── Color maps ──────────────────────────────────────────────────────────────
export const NODE_COLOR: Record<string, string> = {
  CONCEPT: '#3b82f6',
  PERSON: '#22c55e',
  SOURCE: '#a855f7',
  TERM: '#f97316',
};

export const EDGE_COLOR: Record<string, string> = {
  CONTRADICTS: '#ef4444',
  PREREQUISITE_OF: '#3b82f6',
  RELATED_TO: '#94a3b8',
  MENTIONS: '#22c55e',
  CITES: '#a855f7',
};

export const TYPE_LABEL: Record<string, string> = {
  CONCEPT: '\u{1F4A1}',
  PERSON: '\u{1F464}',
  SOURCE: '\u{1F4DA}',
  TERM: '\u{1F3F7}\uFE0F',
};

/** Pre-computed style objects for type-filter buttons to avoid inline object creation. */
export const TYPE_FILTER_STYLE: Record<string, React.CSSProperties> = {
  CONCEPT: { borderColor: NODE_COLOR['CONCEPT'], color: NODE_COLOR['CONCEPT'] },
  PERSON: { borderColor: NODE_COLOR['PERSON'], color: NODE_COLOR['PERSON'] },
  SOURCE: { borderColor: NODE_COLOR['SOURCE'], color: NODE_COLOR['SOURCE'] },
  TERM: { borderColor: NODE_COLOR['TERM'], color: NODE_COLOR['TERM'] },
};

// ─── Mock learning path used when DEV_MODE is true ───────────────────────────
export const MOCK_LEARNING_PATH: ApiLearningPath = {
  steps: 4,
  concepts: [
    {
      id: 'mock-path-1',
      name: 'Introduction to Jewish Philosophy',
      type: 'CONCEPT',
    },
    {
      id: 'mock-path-2',
      name: 'Free Will in Medieval Philosophy',
      type: 'CONCEPT',
    },
    { id: 'mock-path-3', name: 'Maimonides on Providence', type: 'CONCEPT' },
    { id: 'mock-path-4', name: 'Contemporary Applications', type: 'CONCEPT' },
  ],
};

// ─── Static circular layout ──────────────────────────────────────────────────
export function computePositions(nodes: GraphNode[]) {
  return Object.fromEntries(
    nodes.map((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      return [n.id, { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }];
    })
  );
}

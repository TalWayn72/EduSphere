/**
 * KnowledgeSkillTree — visual skill tree showing the knowledge graph as a learnable path.
 *
 * EduSphere KEY differentiator: no competitor renders the knowledge graph as a traversable
 * skill tree with per-node mastery badges. Uses native SVG for edges (no external lib).
 *
 * File exception: interactive SVG tree with layout engine + node rendering (~180 lines).
 */
import { useState, useRef, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';
import { MasteryBadge } from '@/components/ui/MasteryBadge';

export type MasteryLevel = 'none' | 'attempted' | 'familiar' | 'proficient' | 'mastered';

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

// ── Icon map ──────────────────────────────────────────────────────────────────

const MASTERY_ICON: Record<MasteryLevel, string> = {
  none: '○',
  attempted: '◑',
  familiar: '🧠',
  proficient: '⚡',
  mastered: '★',
};

// ── Layout: assign x/y positions via simple BFS layering ──────────────────────

interface LayoutNode extends SkillNode {
  x: number;
  y: number;
}

const NODE_W = 168;
const NODE_H = 96;
const H_GAP = 40;
const V_GAP = 48;

function layoutNodes(nodes: SkillNode[]): LayoutNode[] {
  if (nodes.length === 0) return [];

  const idMap = new Map(nodes.map((n) => [n.id, n]));
  const childSet = new Set(nodes.flatMap((n) => n.children));
  const roots = nodes.filter((n) => !childSet.has(n.id));

  // BFS level assignment
  const levelMap = new Map<string, number>();
  const queue: { id: string; level: number }[] = roots.map((r) => ({ id: r.id, level: 0 }));
  while (queue.length) {
    const { id, level } = queue.shift()!;
    if (levelMap.has(id)) continue;
    levelMap.set(id, level);
    const node = idMap.get(id);
    node?.children.forEach((cid) => queue.push({ id: cid, level: level + 1 }));
  }
  // Nodes not reached by BFS (isolated)
  nodes.forEach((n) => { if (!levelMap.has(n.id)) levelMap.set(n.id, 0); });

  const maxLevel = Math.max(...levelMap.values());
  // Group nodes by level
  const byLevel: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
  nodes.forEach((n) => {
    const lvl = levelMap.get(n.id) ?? 0;
    byLevel[lvl]?.push(n.id);
  });

  const posMap = new Map<string, { x: number; y: number }>();
  byLevel.forEach((ids, level) => {
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = -totalW / 2;
    ids.forEach((id, i) => {
      posMap.set(id, {
        x: startX + i * (NODE_W + H_GAP),
        y: level * (NODE_H + V_GAP),
      });
    });
  });

  return nodes.map((n) => ({
    ...n,
    x: posMap.get(n.id)?.x ?? 0,
    y: posMap.get(n.id)?.y ?? 0,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KnowledgeSkillTree({ nodes, onNodeClick, className }: KnowledgeSkillTreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });

  const laid = layoutNodes(nodes);

  // Compute SVG viewBox from laid-out positions
  useLayoutEffect(() => {
    if (laid.length === 0) return;
    const xs = laid.map((n) => n.x);
    const ys = laid.map((n) => n.y);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    const maxX = Math.max(...xs) + NODE_W + 20;
    const maxY = Math.max(...ys) + NODE_H + 20;
    setSvgSize({ w: maxX - minX, h: maxY - minY });
  }, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const idMap = new Map(laid.map((n) => [n.id, n]));

  // Build edges: parent → child for all parent.children entries
  const edges: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  laid.forEach((parent) => {
    parent.children.forEach((childId) => {
      const child = idMap.get(childId);
      if (!child) return;
      edges.push({
        id: `${parent.id}--${childId}`,
        x1: parent.x + NODE_W / 2,
        y1: parent.y + NODE_H,
        x2: child.x + NODE_W / 2,
        y2: child.y,
      });
    });
  });

  const xs = laid.map((n) => n.x);
  const ys = laid.map((n) => n.y);
  const viewMinX = laid.length ? Math.min(...xs) - 20 : 0;
  const viewMinY = laid.length ? Math.min(...ys) - 20 : 0;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-auto', className)}
      data-testid="skill-tree"
    >
      <svg
        width={svgSize.w}
        height={svgSize.h}
        viewBox={`${viewMinX} ${viewMinY} ${svgSize.w} ${svgSize.h}`}
        className="absolute inset-0 pointer-events-none"
        data-testid="skill-tree-edges"
      >
        {edges.map((e) => (
          <path
            key={e.id}
            d={`M${e.x1},${e.y1} C${e.x1},${(e.y1 + e.y2) / 2} ${e.x2},${(e.y1 + e.y2) / 2} ${e.x2},${e.y2}`}
            stroke="#cbd5e1"
            strokeWidth="2"
            fill="none"
          />
        ))}
      </svg>

      {/* Nodes positioned absolutely over SVG */}
      <div style={{ width: svgSize.w, height: svgSize.h, position: 'relative' }}>
        {laid.map((node) => {
          const isSelected = selectedId === node.id;
          const isClickable = node.unlocked;

          return (
            <button
              key={node.id}
              data-testid={`skill-node-${node.id}`}
              onClick={() => {
                if (!isClickable) return;
                setSelectedId(node.id);
                onNodeClick?.(node.id);
              }}
              disabled={!isClickable}
              style={{
                position: 'absolute',
                left: node.x - viewMinX,
                top: node.y - viewMinY,
                width: NODE_W,
                height: NODE_H,
              }}
              className={cn(
                'flex flex-col justify-between p-3 rounded-lg border bg-card shadow-sm text-left transition-all',
                isClickable ? 'hover:shadow-md cursor-pointer' : 'opacity-40 cursor-not-allowed',
                isSelected && 'ring-2 ring-indigo-500 ring-offset-1'
              )}
            >
              {/* Node header: icon + label */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base leading-none flex-shrink-0" aria-hidden>
                  {MASTERY_ICON[node.mastery]}
                </span>
                <span className="text-xs font-semibold text-foreground truncate" data-testid={`skill-node-label-${node.id}`}>
                  {node.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full" data-testid={`skill-node-progress-${node.id}`}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] text-muted-foreground">{node.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              </div>

              {/* Mastery badge */}
              <MasteryBadge level={node.mastery} size="sm" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Sample data export (8 nodes, branching structure) ─────────────────────────

export const SAMPLE_SKILL_TREE_DATA: SkillNode[] = [
  {
    id: 'html',
    label: 'HTML Foundations',
    mastery: 'mastered',
    progress: 100,
    children: ['css', 'accessibility'],
    unlocked: true,
  },
  {
    id: 'css',
    label: 'CSS Styling',
    mastery: 'proficient',
    progress: 80,
    children: ['javascript'],
    unlocked: true,
  },
  {
    id: 'accessibility',
    label: 'Web Accessibility',
    mastery: 'familiar',
    progress: 60,
    children: [],
    unlocked: true,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    mastery: 'familiar',
    progress: 60,
    children: ['typescript', 'react'],
    unlocked: true,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    mastery: 'attempted',
    progress: 20,
    children: ['nodejs'],
    unlocked: true,
  },
  {
    id: 'react',
    label: 'React',
    mastery: 'none',
    progress: 0,
    children: ['nextjs'],
    unlocked: false,
  },
  {
    id: 'nodejs',
    label: 'Node.js',
    mastery: 'none',
    progress: 0,
    children: [],
    unlocked: false,
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    mastery: 'none',
    progress: 0,
    children: [],
    unlocked: false,
  },
];

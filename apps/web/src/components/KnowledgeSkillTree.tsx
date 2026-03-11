/**
 * KnowledgeSkillTree — visual skill tree showing the knowledge graph as a learnable path.
 *
 * EduSphere KEY differentiator: no competitor renders the knowledge graph as a traversable
 * skill tree with per-node mastery badges. Uses native SVG for edges (no external lib).
 *
 * WCAG 2.1 + ARIA APG Tree View pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * File exception: interactive SVG tree with layout engine + node rendering + ARIA (~210 lines).
 */
import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { useTreeKeyboard, getVisibleOrder } from './useTreeKeyboard';

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

const MASTERY_LABEL: Record<MasteryLevel, string> = {
  none: 'No mastery',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

// ── Layout: assign x/y positions via simple BFS layering ──────────────────────

interface LayoutNode extends SkillNode {
  x: number;
  y: number;
  depth: number;
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
  nodes.forEach((n) => { if (!levelMap.has(n.id)) levelMap.set(n.id, 0); });

  const maxLevel = Math.max(...levelMap.values());
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
    depth: (levelMap.get(n.id) ?? 0) + 1, // aria-level is 1-based
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

const TREE_INSTRUCTIONS_ID = 'skill-tree-keyboard-instructions';

export function KnowledgeSkillTree({ nodes, onNodeClick, className }: KnowledgeSkillTreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(nodes[0]?.id ?? null);
  // All expandable nodes start expanded so the tree is fully visible
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(nodes.filter((n) => n.children.length > 0).map((n) => n.id))
  );
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });
  const nodeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const laid = layoutNodes(nodes);

  // Sync expandedIds when nodes change (new tree loaded)
  useEffect(() => {
    setExpandedIds(new Set(nodes.filter((n) => n.children.length > 0).map((n) => n.id)));
    setFocusedId(nodes[0]?.id ?? null);
  }, [nodes]);

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

  // Focus the DOM button whenever focusedId changes (roving tabindex focus management)
  useEffect(() => {
    if (!focusedId) return;
    const btn = nodeButtonRefs.current.get(focusedId);
    btn?.focus({ preventScroll: false });
    // scrollIntoView is not available in jsdom; guard for test environments
    if (typeof btn?.scrollIntoView === 'function') {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [focusedId]);

  const handleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleCollapse = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleActivate = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (!node?.unlocked) return;
      setSelectedId(id);
      onNodeClick?.(id);
    },
    [nodes, onNodeClick]
  );

  const { containerRef, handleKeyDown } = useTreeKeyboard({
    nodes,
    expandedIds,
    focusedId,
    onFocus: setFocusedId,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    onActivate: handleActivate,
  });

  const idMap = new Map(laid.map((n) => [n.id, n]));

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

  // Compute sibling sets per depth level (for aria-setsize / aria-posinset)
  const levelGroups = new Map<number, string[]>();
  laid.forEach((n) => {
    if (!levelGroups.has(n.depth)) levelGroups.set(n.depth, []);
    levelGroups.get(n.depth)!.push(n.id);
  });

  const visibleOrder = getVisibleOrder(nodes, expandedIds);

  return (
    <>
      {/* Screen reader instructions (visually hidden) */}
      <div className="sr-only" id={TREE_INSTRUCTIONS_ID}>
        Use arrow keys to navigate the skill tree. Press Enter or Space to select a skill.
        Press ArrowRight to expand a node, ArrowLeft to collapse or move to parent.
      </div>

      <div
        ref={(el) => {
          // Assign both refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          (svgContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        role="tree"
        aria-label="Knowledge skill tree"
        aria-multiselectable="false"
        aria-describedby={TREE_INSTRUCTIONS_ID}
        className={cn('relative w-full overflow-auto', className)}
        data-testid="skill-tree"
        onKeyDown={handleKeyDown}
        // tabIndex on container only when no node is focused (fallback)
        tabIndex={focusedId ? -1 : 0}
      >
        <svg
          width={svgSize.w}
          height={svgSize.h}
          viewBox={`${viewMinX} ${viewMinY} ${svgSize.w} ${svgSize.h}`}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
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
            const isFocused = focusedId === node.id;
            const isClickable = node.unlocked;
            const isExpanded = expandedIds.has(node.id);
            const hasChildren = node.children.length > 0;
            const siblings = levelGroups.get(node.depth) ?? [node.id];
            const posInSet = siblings.indexOf(node.id) + 1;
            const isVisible = visibleOrder.includes(node.id);

            if (!isVisible) return null;

            return (
              <button
                key={node.id}
                ref={(el) => {
                  if (el) nodeButtonRefs.current.set(node.id, el);
                  else nodeButtonRefs.current.delete(node.id);
                }}
                // ARIA APG Tree View attributes
                role="treeitem"
                aria-level={node.depth}
                aria-expanded={hasChildren ? isExpanded : undefined}
                aria-selected={isSelected}
                aria-posinset={posInSet}
                aria-setsize={siblings.length}
                aria-label={`${node.label}, ${MASTERY_LABEL[node.mastery]} mastery`}
                // Roving tabindex: only focused node is in tab order
                tabIndex={isFocused ? 0 : -1}
                data-testid={`skill-node-${node.id}`}
                onClick={() => {
                  setFocusedId(node.id);
                  handleActivate(node.id);
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
                  isSelected && 'ring-2 ring-indigo-500 ring-offset-1',
                  isFocused && 'outline-2 outline-indigo-400 outline-offset-1'
                )}
              >
                {/* Node header: icon + label */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none flex-shrink-0" aria-hidden="true">
                    {MASTERY_ICON[node.mastery]}
                  </span>
                  <span
                    className="text-xs font-semibold text-foreground truncate"
                    data-testid={`skill-node-label-${node.id}`}
                  >
                    {node.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full" data-testid={`skill-node-progress-${node.id}`}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] text-muted-foreground">{node.progress}%</span>
                  </div>
                  <div
                    className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={node.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${node.label} progress`}
                  >
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
    </>
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

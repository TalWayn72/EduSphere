/**
 * KnowledgeSkillTree -- visual skill tree showing the knowledge graph as a learnable path.
 *
 * WCAG 2.1 + ARIA APG Tree View pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTreeKeyboard, getVisibleOrder } from './useTreeKeyboard';
import { layoutNodes } from './skillTreeLayout';
import { SkillTreeNode } from './SkillTreeNode';
import { NODE_W, NODE_H } from './KnowledgeSkillTree.types';

// Re-export types + data for backward compatibility
export type { MasteryLevel, SkillNode, KnowledgeSkillTreeProps } from './KnowledgeSkillTree.types';
export { SAMPLE_SKILL_TREE_DATA } from './KnowledgeSkillTree.data';

import type { KnowledgeSkillTreeProps } from './KnowledgeSkillTree.types';

const TREE_INSTRUCTIONS_ID = 'skill-tree-keyboard-instructions';

export function KnowledgeSkillTree({ nodes, onNodeClick, className }: KnowledgeSkillTreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(nodes[0]?.id ?? null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(nodes.filter((n) => n.children.length > 0).map((n) => n.id))
  );
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 800, h: 600 });
  const nodeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const laid = layoutNodes(nodes);

  useEffect(() => {
    setExpandedIds(new Set(nodes.filter((n) => n.children.length > 0).map((n) => n.id)));
    setFocusedId(nodes[0]?.id ?? null);
  }, [nodes]);

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

  useEffect(() => {
    if (!focusedId) return;
    const btn = nodeButtonRefs.current.get(focusedId);
    btn?.focus({ preventScroll: false });
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

  const levelGroups = new Map<number, string[]>();
  laid.forEach((n) => {
    if (!levelGroups.has(n.depth)) levelGroups.set(n.depth, []);
    levelGroups.get(n.depth)!.push(n.id);
  });

  const visibleOrder = getVisibleOrder(nodes, expandedIds);

  return (
    <>
      <div className="sr-only" id={TREE_INSTRUCTIONS_ID}>
        Use arrow keys to navigate the skill tree. Press Enter or Space to select a skill.
        Press ArrowRight to expand a node, ArrowLeft to collapse or move to parent.
      </div>

      <div
        ref={(el) => {
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

        <div style={{ width: svgSize.w, height: svgSize.h, position: 'relative' }}>
          {laid.map((node) => {
            const siblings = levelGroups.get(node.depth) ?? [node.id];
            const isVisible = visibleOrder.includes(node.id);
            if (!isVisible) return null;

            return (
              <SkillTreeNode
                key={node.id}
                node={node}
                isSelected={selectedId === node.id}
                isFocused={focusedId === node.id}
                isExpanded={expandedIds.has(node.id)}
                hasChildren={node.children.length > 0}
                posInSet={siblings.indexOf(node.id) + 1}
                setSize={siblings.length}
                viewMinX={viewMinX}
                viewMinY={viewMinY}
                onFocus={setFocusedId}
                onActivate={handleActivate}
                buttonRef={(el) => {
                  if (el) nodeButtonRefs.current.set(node.id, el);
                  else nodeButtonRefs.current.delete(node.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

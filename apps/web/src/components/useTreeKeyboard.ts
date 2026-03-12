/**
 * useTreeKeyboard — ARIA APG Tree View keyboard navigation hook.
 *
 * Implements the full APG Tree View keyboard interaction model:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * Roving tabIndex: only the focused node gets tabIndex=0; all others get -1.
 */
import { useCallback, useRef } from 'react';

export interface TreeKeyboardNode {
  id: string;
  children: string[];
  unlocked: boolean;
}

interface UseTreeKeyboardOptions {
  nodes: TreeKeyboardNode[];
  /** IDs that are currently expanded (have visible children). */
  expandedIds: Set<string>;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onActivate: (id: string) => void;
}

/** Returns the flat ordered list of currently visible node IDs (BFS, respecting expanded state). */
export function getVisibleOrder(
  nodes: TreeKeyboardNode[],
  expandedIds: Set<string>
): string[] {
  const idMap = new Map(nodes.map((n) => [n.id, n]));
  const childSet = new Set(nodes.flatMap((n) => n.children));
  const roots = nodes.filter((n) => !childSet.has(n.id));

  const visible: string[] = [];
  const stack = [...roots.map((r) => r.id)];
  while (stack.length) {
    const id = stack.shift()!;
    visible.push(id);
    if (expandedIds.has(id)) {
      const node = idMap.get(id);
      if (node) {
        // Prepend children so they appear right after parent
        stack.unshift(...node.children);
      }
    }
  }
  return visible;
}

/** Returns the parent ID of the given node, or null if root. */
function findParentId(nodes: TreeKeyboardNode[], childId: string): string | null {
  for (const n of nodes) {
    if (n.children.includes(childId)) return n.id;
  }
  return null;
}

export function useTreeKeyboard({
  nodes,
  expandedIds,
  focusedId,
  onFocus,
  onExpand,
  onCollapse,
  onActivate,
}: UseTreeKeyboardOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const visibleOrder = getVisibleOrder(nodes, expandedIds);
      const currentIdx = focusedId ? visibleOrder.indexOf(focusedId) : -1;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = visibleOrder[currentIdx + 1];
          if (next) onFocus(next);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = visibleOrder[currentIdx - 1];
          if (prev) onFocus(prev);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (!focusedId) break;
          const node = nodes.find((n) => n.id === focusedId);
          if (!node || node.children.length === 0) break;
          if (!expandedIds.has(focusedId)) {
            onExpand(focusedId);
          } else {
            // Already expanded — move focus to first child
            const firstChild = node.children[0];
            if (firstChild) onFocus(firstChild);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (!focusedId) break;
          if (expandedIds.has(focusedId)) {
            onCollapse(focusedId);
          } else {
            const parentId = findParentId(nodes, focusedId);
            if (parentId) onFocus(parentId);
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (focusedId) onActivate(focusedId);
          break;
        }
        case 'Home': {
          e.preventDefault();
          const first = visibleOrder[0];
          if (first) onFocus(first);
          break;
        }
        case 'End': {
          e.preventDefault();
          const last = visibleOrder[visibleOrder.length - 1];
          if (last) onFocus(last);
          break;
        }
        default:
          break;
      }
    },
    [nodes, expandedIds, focusedId, onFocus, onExpand, onCollapse, onActivate]
  );

  return { containerRef, handleKeyDown };
}

import type { SkillNode, LayoutNode } from './KnowledgeSkillTree.types';
import { NODE_W, NODE_H, H_GAP, V_GAP } from './KnowledgeSkillTree.types';

/**
 * Assign x/y positions via simple BFS layering.
 */
export function layoutNodes(nodes: SkillNode[]): LayoutNode[] {
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

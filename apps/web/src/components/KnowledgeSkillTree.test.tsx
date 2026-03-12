/**
 * KnowledgeSkillTree tests — covers WCAG 2.1 ARIA APG Tree View pattern
 * and existing rendering behaviour.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeSkillTree, SAMPLE_SKILL_TREE_DATA } from './KnowledgeSkillTree';
import type { SkillNode } from './KnowledgeSkillTree';
import { getVisibleOrder } from './useTreeKeyboard';

vi.mock('lucide-react', () => ({}));

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_NODES: SkillNode[] = [
  {
    id: 'node-a',
    label: 'Node A',
    mastery: 'mastered',
    progress: 100,
    children: ['node-b', 'node-c'],
    unlocked: true,
  },
  {
    id: 'node-b',
    label: 'Node B',
    mastery: 'familiar',
    progress: 60,
    children: [],
    unlocked: true,
  },
  {
    id: 'node-c',
    label: 'Node C',
    mastery: 'none',
    progress: 0,
    children: [],
    unlocked: false,
  },
];

// ── Existing rendering tests (preserved) ──────────────────────────────────────

describe('KnowledgeSkillTree — rendering', () => {
  it('renders all nodes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-node-node-a')).toBeInTheDocument();
    expect(screen.getByTestId('skill-node-node-b')).toBeInTheDocument();
    expect(screen.getByTestId('skill-node-node-c')).toBeInTheDocument();
  });

  it('applies opacity class to locked nodes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const lockedNode = screen.getByTestId('skill-node-node-c');
    expect(lockedNode.className).toContain('opacity-40');
  });

  it('renders a MasteryBadge for each node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('mastery-badge-mastered')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-familiar')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-none')).toBeInTheDocument();
  });

  it('renders a progress bar for each node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-node-progress-node-a')).toBeInTheDocument();
    expect(screen.getByTestId('skill-node-progress-node-b')).toBeInTheDocument();
    expect(screen.getByTestId('skill-node-progress-node-c')).toBeInTheDocument();
  });

  it('calls onNodeClick for unlocked node clicks', () => {
    const onNodeClick = vi.fn();
    render(<KnowledgeSkillTree nodes={MOCK_NODES} onNodeClick={onNodeClick} />);
    fireEvent.click(screen.getByTestId('skill-node-node-a'));
    expect(onNodeClick).toHaveBeenCalledWith('node-a');
  });

  it('does not call onNodeClick for locked node clicks', () => {
    const onNodeClick = vi.fn();
    render(<KnowledgeSkillTree nodes={MOCK_NODES} onNodeClick={onNodeClick} />);
    fireEvent.click(screen.getByTestId('skill-node-node-c'));
    expect(onNodeClick).not.toHaveBeenCalled();
  });

  it('renders the SVG edges element', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-tree-edges')).toBeInTheDocument();
  });

  it('renders node labels correctly', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-node-label-node-a')).toHaveTextContent('Node A');
    expect(screen.getByTestId('skill-node-label-node-b')).toHaveTextContent('Node B');
    expect(screen.getByTestId('skill-node-label-node-c')).toHaveTextContent('Node C');
  });

  it('exports SAMPLE_SKILL_TREE_DATA with 8 nodes', () => {
    expect(SAMPLE_SKILL_TREE_DATA).toHaveLength(8);
    expect(SAMPLE_SKILL_TREE_DATA.every((n) => n.id && n.label && n.mastery !== undefined)).toBe(true);
  });

  it('has required data-testid attributes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-tree')).toBeInTheDocument();
    expect(screen.getByTestId('skill-tree-edges')).toBeInTheDocument();
    MOCK_NODES.forEach((n) => {
      expect(screen.getByTestId(`skill-node-${n.id}`)).toBeInTheDocument();
    });
  });
});

// ── ARIA APG Tree View tests ───────────────────────────────────────────────────

describe('KnowledgeSkillTree — ARIA APG Tree View', () => {
  it('has role="tree" on the container', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('has aria-label on the tree container', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-label', 'Knowledge skill tree');
  });

  it('has aria-multiselectable="false" on the tree container', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-multiselectable', 'false');
  });

  it('renders nodes with role="treeitem"', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const items = screen.getAllByRole('treeitem');
    expect(items.length).toBe(MOCK_NODES.length);
  });

  it('sets aria-level matching BFS depth (1-based)', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    // node-a is a root → depth 1
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('aria-level', '1');
    // node-b and node-c are children of node-a → depth 2
    expect(screen.getByTestId('skill-node-node-b')).toHaveAttribute('aria-level', '2');
    expect(screen.getByTestId('skill-node-node-c')).toHaveAttribute('aria-level', '2');
  });

  it('sets aria-expanded on expandable nodes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    // node-a has children → should have aria-expanded
    const nodeA = screen.getByTestId('skill-node-node-a');
    expect(nodeA).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not set aria-expanded on leaf nodes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const nodeB = screen.getByTestId('skill-node-node-b');
    // Leaf nodes must not carry aria-expanded
    expect(nodeB).not.toHaveAttribute('aria-expanded');
  });

  it('sets aria-selected on nodes (initially false)', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const items = screen.getAllByRole('treeitem');
    items.forEach((item) => {
      expect(item).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('sets aria-selected=true after clicking an unlocked node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    fireEvent.click(screen.getByTestId('skill-node-node-a'));
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('aria-selected', 'true');
  });

  it('sets aria-posinset and aria-setsize correctly', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    // node-a is the only root → posinset=1, setsize=1
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('aria-posinset', '1');
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('aria-setsize', '1');
    // node-b and node-c are siblings at depth 2 → setsize=2
    expect(screen.getByTestId('skill-node-node-b')).toHaveAttribute('aria-setsize', '2');
    expect(screen.getByTestId('skill-node-node-c')).toHaveAttribute('aria-setsize', '2');
  });

  it('includes mastery level in aria-label', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const nodeA = screen.getByTestId('skill-node-node-a');
    expect(nodeA).toHaveAttribute('aria-label', expect.stringContaining('Node A'));
    expect(nodeA).toHaveAttribute('aria-label', expect.stringContaining('Mastered'));
  });

  it('renders screen reader instructions (sr-only)', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    // The sr-only div should exist in the DOM even if visually hidden
    expect(document.getElementById('skill-tree-keyboard-instructions')).toBeInTheDocument();
    expect(document.getElementById('skill-tree-keyboard-instructions')?.textContent).toMatch(
      /arrow keys/i
    );
  });

  it('tree container is linked to instructions via aria-describedby', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-describedby', 'skill-tree-keyboard-instructions');
  });

  it('sets tabIndex=0 on first node (roving tabindex)', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    // First visible node (root = node-a) should be in the tab order
    const nodeA = screen.getByTestId('skill-node-node-a');
    expect(nodeA).toHaveAttribute('tabindex', '0');
  });

  it('sets tabIndex=-1 on non-focused nodes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    expect(screen.getByTestId('skill-node-node-b')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('skill-node-node-c')).toHaveAttribute('tabindex', '-1');
  });

  it('progress bar has role="progressbar" with correct aria attributes', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBe(MOCK_NODES.length);
    // node-a has progress 100
    const barA = bars.find((b) => b.getAttribute('aria-label') === 'Node A progress');
    expect(barA).toHaveAttribute('aria-valuenow', '100');
    expect(barA).toHaveAttribute('aria-valuemin', '0');
    expect(barA).toHaveAttribute('aria-valuemax', '100');
  });

  it('SVG is aria-hidden from screen readers', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const svg = screen.getByTestId('skill-tree-edges');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

// ── Keyboard navigation tests ─────────────────────────────────────────────────

describe('KnowledgeSkillTree — keyboard navigation', () => {
  it('ArrowDown moves focus to the next visible node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    // Initial focus is on node-a; ArrowDown → node-b (first child in visible order)
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    expect(screen.getByTestId('skill-node-node-b')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowUp moves focus to the previous visible node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    // Move down first (node-a → node-b), then up (node-b → node-a)
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowUp' });
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('tabindex', '0');
  });

  it('ArrowDown at last node keeps focus on last node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    // Move to end
    fireEvent.keyDown(tree, { key: 'End' });
    const lastFocused = screen.getAllByRole('treeitem').find((el) => el.getAttribute('tabindex') === '0');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    const stillFocused = screen.getAllByRole('treeitem').find((el) => el.getAttribute('tabindex') === '0');
    expect(stillFocused).toBe(lastFocused);
  });

  it('Home moves focus to the first node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'Home' });
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('tabindex', '0');
  });

  it('End moves focus to the last visible node', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: 'End' });
    // node-c is last in BFS order [node-a, node-b, node-c]
    expect(screen.getByTestId('skill-node-node-c')).toHaveAttribute('tabindex', '0');
  });

  it('Enter activates (selects) the focused unlocked node', () => {
    const onNodeClick = vi.fn();
    render(<KnowledgeSkillTree nodes={MOCK_NODES} onNodeClick={onNodeClick} />);
    const tree = screen.getByRole('tree');
    // Focus is on node-a (unlocked)
    fireEvent.keyDown(tree, { key: 'Enter' });
    expect(onNodeClick).toHaveBeenCalledWith('node-a');
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('aria-selected', 'true');
  });

  it('Space activates the focused unlocked node', () => {
    const onNodeClick = vi.fn();
    render(<KnowledgeSkillTree nodes={MOCK_NODES} onNodeClick={onNodeClick} />);
    const tree = screen.getByRole('tree');
    fireEvent.keyDown(tree, { key: ' ' });
    expect(onNodeClick).toHaveBeenCalledWith('node-a');
  });

  it('Enter does not activate a locked node', () => {
    const onNodeClick = vi.fn();
    render(<KnowledgeSkillTree nodes={MOCK_NODES} onNodeClick={onNodeClick} />);
    const tree = screen.getByRole('tree');
    // Navigate to node-c (locked)
    fireEvent.keyDown(tree, { key: 'End' });
    fireEvent.keyDown(tree, { key: 'Enter' });
    expect(onNodeClick).not.toHaveBeenCalled();
  });

  it('ArrowRight expands a collapsed expandable node', () => {
    // Render with node-a's children explicitly collapsed to test expansion
    const nodes: SkillNode[] = [
      { id: 'p', label: 'Parent', mastery: 'mastered', progress: 100, children: ['c'], unlocked: true },
      { id: 'c', label: 'Child', mastery: 'none', progress: 0, children: [], unlocked: true },
    ];
    render(<KnowledgeSkillTree nodes={nodes} />);
    const tree = screen.getByRole('tree');
    // Parent starts expanded (default); collapse it first via ArrowLeft
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    // Parent is now collapsed — ArrowRight should re-expand
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(screen.getByTestId('skill-node-p')).toHaveAttribute('aria-expanded', 'true');
  });

  it('ArrowLeft collapses an expanded node', () => {
    const nodes: SkillNode[] = [
      { id: 'p', label: 'Parent', mastery: 'mastered', progress: 100, children: ['c'], unlocked: true },
      { id: 'c', label: 'Child', mastery: 'none', progress: 0, children: [], unlocked: true },
    ];
    render(<KnowledgeSkillTree nodes={nodes} />);
    const tree = screen.getByRole('tree');
    // Parent starts expanded; ArrowLeft collapses it
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(screen.getByTestId('skill-node-p')).toHaveAttribute('aria-expanded', 'false');
  });

  it('ArrowLeft on root leaf node does nothing (no parent)', () => {
    render(<KnowledgeSkillTree nodes={MOCK_NODES} />);
    const tree = screen.getByRole('tree');
    // Collapse node-a (it has children)
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    // Now ArrowLeft again: no parent → focus stays on node-a
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    expect(screen.getByTestId('skill-node-node-a')).toHaveAttribute('tabindex', '0');
  });
});

// ── getVisibleOrder utility tests ─────────────────────────────────────────────

describe('getVisibleOrder', () => {
  const nodes = [
    { id: 'root', children: ['child1', 'child2'], unlocked: true },
    { id: 'child1', children: ['grandchild'], unlocked: true },
    { id: 'child2', children: [], unlocked: true },
    { id: 'grandchild', children: [], unlocked: true },
  ];

  it('shows all nodes when all expanded', () => {
    const order = getVisibleOrder(nodes, new Set(['root', 'child1']));
    expect(order).toEqual(['root', 'child1', 'grandchild', 'child2']);
  });

  it('hides children of collapsed nodes', () => {
    const order = getVisibleOrder(nodes, new Set(['root']));
    // child1 is visible but collapsed → grandchild is hidden; child2 is visible
    expect(order).toContain('root');
    expect(order).toContain('child1');
    expect(order).toContain('child2');
    expect(order).not.toContain('grandchild');
  });

  it('returns only root when nothing expanded', () => {
    const order = getVisibleOrder(nodes, new Set());
    expect(order).toEqual(['root']);
  });
});

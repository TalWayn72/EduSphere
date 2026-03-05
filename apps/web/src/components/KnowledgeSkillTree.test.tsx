import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KnowledgeSkillTree, SAMPLE_SKILL_TREE_DATA } from './KnowledgeSkillTree';
import type { SkillNode } from './KnowledgeSkillTree';

// MasteryBadge renders as a real component via its import — no mock needed.
// We DO mock lucide-react to avoid SVG render issues in jsdom.
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KnowledgeSkillTree', () => {
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
    // MasteryBadge uses data-testid="mastery-badge-<level>"
    expect(screen.getByTestId('mastery-badge-mastered')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-familiar')).toBeInTheDocument();
    // node-c has mastery 'none'
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

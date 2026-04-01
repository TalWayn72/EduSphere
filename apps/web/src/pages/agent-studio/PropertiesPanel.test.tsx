import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import type { WorkflowNode, WorkflowEdge } from './agent-studio.types';

// ── shadcn mocks ──────────────────────────────────────────────────────────────
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// ── fixtures ──────────────────────────────────────────────────────────────────
const startNode: WorkflowNode = {
  id: 'node-1',
  type: 'START',
  label: 'Begin',
  x: 100,
  y: 100,
};

const assessNode: WorkflowNode = {
  id: 'node-2',
  type: 'ASSESS',
  label: 'Assessment Step',
  x: 200,
  y: 200,
};

const endNode: WorkflowNode = {
  id: 'node-3',
  type: 'END',
  label: 'Finish',
  x: 300,
  y: 300,
};

const edges: WorkflowEdge[] = [
  { id: 'edge-1', source: 'node-1', target: 'node-2' },
  { id: 'edge-2', source: 'node-2', target: 'node-3' },
];

const defaultProps = {
  selectedNode: undefined as WorkflowNode | undefined,
  connecting: null as string | null,
  nodes: [startNode, assessNode, endNode],
  edges,
  onLabelChange: vi.fn(),
  onDelete: vi.fn(),
};

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<PropertiesPanel {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('PropertiesPanel — no selection', () => {
  it('renders properties heading', () => {
    renderPanel();
    expect(screen.getByText('Properties')).toBeTruthy();
  });

  it('shows placeholder when no node is selected', () => {
    renderPanel();
    expect(
      screen.getByText('Select a node to edit its properties')
    ).toBeTruthy();
  });

  it('shows connecting message when connecting mode is active', () => {
    renderPanel({ connecting: 'node-1' });
    expect(
      screen.getByText('Click a node on the canvas to connect')
    ).toBeTruthy();
  });
});

describe('PropertiesPanel — workflow summary', () => {
  it('shows node count', () => {
    renderPanel();
    expect(screen.getByText('3 nodes')).toBeTruthy();
  });

  it('shows connection count', () => {
    renderPanel();
    expect(screen.getByText('2 connections')).toBeTruthy();
  });

  it('does not show workflow section when nodes array is empty', () => {
    renderPanel({ nodes: [], edges: [] });
    expect(screen.queryByText(/nodes/)).toBeNull();
    expect(screen.queryByText(/connections/)).toBeNull();
  });

  it('shows Workflow label', () => {
    renderPanel();
    expect(screen.getByText('Workflow')).toBeTruthy();
  });
});

describe('PropertiesPanel — selected node', () => {
  it('shows node type label', () => {
    renderPanel({ selectedNode: startNode });
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('shows node type for ASSESS', () => {
    renderPanel({ selectedNode: assessNode });
    expect(screen.getByText('Assess')).toBeTruthy();
  });

  it('shows Type and Label labels', () => {
    renderPanel({ selectedNode: startNode });
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('Label')).toBeTruthy();
  });

  it('renders label input with current value', () => {
    renderPanel({ selectedNode: assessNode });
    const input = screen.getByTestId('node-label-input') as HTMLInputElement;
    expect(input.value).toBe('Assessment Step');
  });

  it('calls onLabelChange when input value changes', () => {
    const onLabelChange = vi.fn();
    renderPanel({ selectedNode: assessNode, onLabelChange });
    fireEvent.change(screen.getByTestId('node-label-input'), {
      target: { value: 'New Label' },
    });
    expect(onLabelChange).toHaveBeenCalledWith('node-2', 'New Label');
  });

  it('shows outgoing connection count for selected node', () => {
    renderPanel({ selectedNode: startNode });
    expect(screen.getByText(/Connections out:\s*1/)).toBeTruthy();
  });

  it('shows zero connections for end node', () => {
    renderPanel({ selectedNode: endNode });
    expect(screen.getByText(/Connections out:\s*0/)).toBeTruthy();
  });

  it('renders delete button', () => {
    renderPanel({ selectedNode: startNode });
    expect(screen.getByTestId('delete-node-btn')).toBeTruthy();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    renderPanel({ selectedNode: startNode, onDelete });
    fireEvent.click(screen.getByTestId('delete-node-btn'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not show placeholder text when node is selected', () => {
    renderPanel({ selectedNode: startNode });
    expect(
      screen.queryByText('Select a node to edit its properties')
    ).toBeNull();
  });
});

describe('PropertiesPanel — edge cases', () => {
  it('renders panel with data-testid', () => {
    renderPanel();
    expect(screen.getByTestId('properties-panel')).toBeTruthy();
  });

  it('handles node with multiple outgoing edges', () => {
    const extraEdges = [
      ...edges,
      { id: 'edge-3', source: 'node-1', target: 'node-3' },
    ];
    renderPanel({ selectedNode: startNode, edges: extraEdges });
    expect(screen.getByText(/Connections out:\s*2/)).toBeTruthy();
  });

  it('renders END node type label', () => {
    renderPanel({ selectedNode: endNode });
    expect(screen.getByText('End')).toBeTruthy();
  });
});

/**
 * AgentStudioPage tests — G5 No-Code Agent Workflow Builder.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentStudioPage } from './AgentStudioPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, vi.fn().mockResolvedValue({ data: {}, error: null })]),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@/lib/auth', () => ({
  DEV_MODE: true,
  getCurrentUser: () => ({
    id: 'user-1',
    name: 'Test User',
    role: 'INSTRUCTOR',
    tenantId: 'tenant-1',
  }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/graphql/agent.queries', () => ({
  CREATE_AGENT_WORKFLOW_MUTATION: 'CREATE_AGENT_WORKFLOW_MUTATION',
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AgentStudioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Layout / rendering ────────────────────────────────────────────────────

  it('renders the workflow name input', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('workflow-name-input')).toBeInTheDocument();
  });

  it('renders Save and Deploy buttons', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('save-workflow-btn')).toBeInTheDocument();
    expect(screen.getByTestId('deploy-workflow-btn')).toBeInTheDocument();
  });

  it('renders the node palette', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('node-palette')).toBeInTheDocument();
  });

  it('renders all 6 node types in the palette', () => {
    render(<AgentStudioPage />);
    for (const type of ['start', 'assess', 'explain', 'quiz', 'debate', 'end']) {
      expect(screen.getByTestId(`palette-${type}`)).toBeInTheDocument();
    }
  });

  it('renders the workflow canvas', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument();
  });

  it('renders the properties panel', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
  });

  it('shows empty-state prompt on canvas when no nodes', () => {
    render(<AgentStudioPage />);
    expect(
      screen.getByText(/drag nodes here/i)
    ).toBeInTheDocument();
  });

  // ── Workflow name ─────────────────────────────────────────────────────────

  it('updates workflow name on input change', () => {
    render(<AgentStudioPage />);
    const input = screen.getByTestId('workflow-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Workflow Name' } });
    expect(input.value).toBe('New Workflow Name');
  });

  // ── Save / Deploy disabled when no nodes ─────────────────────────────────

  it('Save button is disabled when canvas is empty', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('save-workflow-btn')).toBeDisabled();
  });

  it('Deploy button is disabled when canvas is empty', () => {
    render(<AgentStudioPage />);
    expect(screen.getByTestId('deploy-workflow-btn')).toBeDisabled();
  });

  // ── Drop to add nodes ─────────────────────────────────────────────────────

  it('adds a node to canvas on drop', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    // Simulate drop event
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'ASSESS' },
    });
    // Canvas should now show a workflow node
    const nodes = document.querySelectorAll('[data-testid^="workflow-node-"]');
    expect(nodes.length).toBe(1);
  });

  it('enables Save button after a node is dropped', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'START' },
    });
    expect(screen.getByTestId('save-workflow-btn')).not.toBeDisabled();
  });

  it('shows "Drag nodes here" prompt disappears after drop', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'START' },
    });
    expect(screen.queryByText(/drag nodes here/i)).toBeNull();
  });

  // ── Select node ───────────────────────────────────────────────────────────

  it('shows properties panel with node type when a node is clicked', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'EXPLAIN' },
    });
    const node = document.querySelector('[data-testid^="workflow-node-"]')!;
    fireEvent.click(node);
    // Should show label input and delete button
    expect(screen.getByTestId('node-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('delete-node-btn')).toBeInTheDocument();
  });

  it('label input reflects the node label', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'QUIZ' },
    });
    const node = document.querySelector('[data-testid^="workflow-node-"]')!;
    fireEvent.click(node);
    const labelInput = screen.getByTestId('node-label-input') as HTMLInputElement;
    expect(labelInput.value).toBe('Quiz');
  });

  // ── Delete node ───────────────────────────────────────────────────────────

  it('removes node from canvas when Delete button clicked', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 200,
      clientY: 200,
      dataTransfer: { getData: () => 'DEBATE' },
    });
    const node = document.querySelector('[data-testid^="workflow-node-"]')!;
    fireEvent.click(node);
    fireEvent.click(screen.getByTestId('delete-node-btn'));
    expect(document.querySelectorAll('[data-testid^="workflow-node-"]').length).toBe(0);
  });

  // ── Connect nodes ─────────────────────────────────────────────────────────

  it('shows connection-mode indicator when first node is clicked', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 100,
      clientY: 100,
      dataTransfer: { getData: () => 'START' },
    });
    const node = document.querySelector('[data-testid^="workflow-node-"]')!;
    fireEvent.click(node);
    expect(screen.getByText(/click a target node/i)).toBeInTheDocument();
  });

  it('creates an edge SVG path when two nodes are connected', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');

    // Drop two nodes
    fireEvent.drop(canvas, {
      clientX: 100,
      clientY: 100,
      dataTransfer: { getData: () => 'START' },
    });
    fireEvent.drop(canvas, {
      clientX: 300,
      clientY: 200,
      dataTransfer: { getData: () => 'ASSESS' },
    });

    const [node1, node2] = document.querySelectorAll('[data-testid^="workflow-node-"]');
    // Click first to start connecting
    fireEvent.click(node1!);
    // Click second to complete connection
    fireEvent.click(node2!);

    // SVG path should now exist for the edge
    const paths = document.querySelectorAll('svg path:not([d="M0,0 L0,6 L8,3 z"])');
    expect(paths.length).toBeGreaterThan(0);
  });

  // ── Properties panel stats ────────────────────────────────────────────────

  it('shows node and connection count in properties panel', () => {
    render(<AgentStudioPage />);
    const canvas = screen.getByTestId('workflow-canvas');
    fireEvent.drop(canvas, {
      clientX: 100,
      clientY: 100,
      dataTransfer: { getData: () => 'START' },
    });
    // Should show "1 nodes"
    expect(screen.getByText('1 nodes')).toBeInTheDocument();
    expect(screen.getByText('0 connections')).toBeInTheDocument();
  });
});

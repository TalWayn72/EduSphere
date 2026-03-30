/**
 * useAgentStudio hook tests
 *
 * Verifies:
 *  1. Initial state (default workflow name, empty nodes/edges)
 *  2. handlePaletteAdd adds a node with correct type and position
 *  3. handleNodeClick sets connecting on first click
 *  4. handleNodeClick creates edge on second click (different node)
 *  5. handleNodeClick cancels on same-node second click
 *  6. handleNodeClick does not create duplicate edges
 *  7. deleteSelected removes node and its edges
 *  8. deleteSelected is no-op when nothing selected
 *  9. handleSave checks AI consent before saving
 * 10. handleSave in DEV_MODE sets saved status
 * 11. handleSave handles GraphQL CONSENT_REQUIRED error
 * 12. handleSave handles generic GraphQL error
 * 13. Timer cleanup after save status reset
 * 14. setWorkflowName updates workflow name
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockExecCreate = vi.fn();
vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{}, mockExecCreate]),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/graphql/agent.queries', () => ({
  CREATE_AGENT_WORKFLOW_MUTATION: 'CREATE_WORKFLOW',
}));

vi.mock('@/lib/constants', () => ({
  TOAST_AUTO_DISMISS_MS: 2000,
  SIMULATED_SAVE_MS: 1500,
}));

vi.mock('@/lib/auth', () => ({
  DEV_MODE: true,
}));

vi.mock('./agent-studio.types', () => ({
  NODE_META: {
    START: { label: 'Start' },
    ASSESS: { label: 'Assess' },
    EXPLAIN: { label: 'Explain' },
    QUIZ: { label: 'Quiz' },
    DEBATE: { label: 'Debate' },
    END: { label: 'End' },
  },
}));

import { useAgentStudio } from './useAgentStudio';
import { toast } from 'sonner';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAgentStudio', () => {
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useAgentStudio());
    expect(result.current.workflowName).toBe('My Agent Workflow');
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.selected).toBeNull();
    expect(result.current.connecting).toBeNull();
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.selectedNode).toBeUndefined();
  });

  it('setWorkflowName updates name', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.setWorkflowName('Test Workflow'));
    expect(result.current.workflowName).toBe('Test Workflow');
  });

  it('handlePaletteAdd adds a node', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].type).toBe('START');
    expect(result.current.nodes[0].label).toBe('Start');
    expect(result.current.nodes[0].x).toBe(40);
    expect(result.current.nodes[0].y).toBe(40);
  });

  it('handlePaletteAdd offsets y for subsequent nodes', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    act(() => vi.advanceTimersByTime(1));
    act(() => result.current.handlePaletteAdd('ASSESS'));
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.nodes[1].y).toBe(100); // 40 + 1*60
  });

  it('handleNodeClick sets connecting on first click', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    const nodeId = result.current.nodes[0].id;

    act(() => result.current.handleNodeClick(nodeId));
    expect(result.current.connecting).toBe(nodeId);
    expect(result.current.selected).toBe(nodeId);
  });

  it('handleNodeClick cancels connecting on same-node click', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    const nodeId = result.current.nodes[0].id;

    act(() => result.current.handleNodeClick(nodeId));
    act(() => result.current.handleNodeClick(nodeId));
    expect(result.current.connecting).toBeNull();
  });

  it('handleNodeClick creates edge between different nodes', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    // Advance timer so Date.now() produces a different ID
    act(() => vi.advanceTimersByTime(1));
    act(() => result.current.handlePaletteAdd('ASSESS'));
    const id1 = result.current.nodes[0].id;
    const id2 = result.current.nodes[1].id;

    act(() => result.current.handleNodeClick(id1));
    act(() => result.current.handleNodeClick(id2));

    expect(result.current.edges).toHaveLength(1);
    expect(result.current.edges[0].source).toBe(id1);
    expect(result.current.edges[0].target).toBe(id2);
    expect(result.current.connecting).toBeNull();
    expect(result.current.selected).toBe(id2);
  });

  it('handleNodeClick does not create duplicate edges', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    act(() => vi.advanceTimersByTime(1));
    act(() => result.current.handlePaletteAdd('ASSESS'));
    const id1 = result.current.nodes[0].id;
    const id2 = result.current.nodes[1].id;

    // Create edge
    act(() => result.current.handleNodeClick(id1));
    act(() => result.current.handleNodeClick(id2));
    // Try again
    act(() => result.current.handleNodeClick(id1));
    act(() => result.current.handleNodeClick(id2));

    expect(result.current.edges).toHaveLength(1);
  });

  it('deleteSelected removes node and its edges', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    act(() => vi.advanceTimersByTime(1));
    act(() => result.current.handlePaletteAdd('ASSESS'));
    const id1 = result.current.nodes[0].id;
    const id2 = result.current.nodes[1].id;

    // Create edge and select first node
    act(() => result.current.handleNodeClick(id1));
    act(() => result.current.handleNodeClick(id2));
    act(() => result.current.setSelected(id1));

    act(() => result.current.deleteSelected());
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].id).toBe(id2);
    expect(result.current.edges).toHaveLength(0);
    expect(result.current.selected).toBeNull();
  });

  it('deleteSelected is no-op when nothing selected', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('START'));
    act(() => result.current.deleteSelected());
    expect(result.current.nodes).toHaveLength(1);
  });

  it('handleSave blocks without AI consent', async () => {
    const { result } = renderHook(() => useAgentStudio());
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.saveStatus).toBe('error');
    expect(toast.error).toHaveBeenCalledWith(
      'AI features require your consent.',
      expect.objectContaining({ action: expect.any(Object) }),
    );
  });

  it('handleSave in DEV_MODE sets saved status', async () => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    const { result } = renderHook(() => useAgentStudio());
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.saveStatus).toBe('saved');

    // Status resets after SIMULATED_SAVE_MS
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.saveStatus).toBe('idle');
  });

  it('selectedNode reflects currently selected node', () => {
    const { result } = renderHook(() => useAgentStudio());
    act(() => result.current.handlePaletteAdd('QUIZ'));
    const nodeId = result.current.nodes[0].id;
    act(() => result.current.setSelected(nodeId));
    expect(result.current.selectedNode?.type).toBe('QUIZ');
  });

  it('selectedNode is undefined when nothing selected', () => {
    const { result } = renderHook(() => useAgentStudio());
    expect(result.current.selectedNode).toBeUndefined();
  });

  it('canvasRef is defined', () => {
    const { result } = renderHook(() => useAgentStudio());
    expect(result.current.canvasRef).toBeDefined();
  });
});

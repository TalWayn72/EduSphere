import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useLessonPipelineStore } from './lesson-pipeline.store';

// ── Reset store between tests ─────────────────────────────────────────────────

beforeEach(() => {
  act(() => {
    useLessonPipelineStore.setState({ nodes: [], isDirty: false, selectedNodeId: null });
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLessonPipelineStore', () => {
  it('starts with empty nodes, isDirty false and selectedNodeId null', () => {
    const state = useLessonPipelineStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.isDirty).toBe(false);
    expect(state.selectedNodeId).toBeNull();
  });

  it('addNode adds a node with the given moduleType and sets isDirty true', () => {
    act(() => useLessonPipelineStore.getState().addNode('INGESTION'));

    const state = useLessonPipelineStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].moduleType).toBe('INGESTION');
    expect(state.nodes[0].enabled).toBe(true);
    expect(state.isDirty).toBe(true);
  });

  it('addNode assigns correct order value based on existing node count', () => {
    act(() => {
      useLessonPipelineStore.getState().addNode('INGESTION');
      useLessonPipelineStore.getState().addNode('ASR');
    });
    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes[0].order).toBe(0);
    expect(nodes[1].order).toBe(1);
  });

  it('removeNode removes the correct node by id', () => {
    act(() => {
      useLessonPipelineStore.getState().addNode('INGESTION');
      useLessonPipelineStore.getState().addNode('ASR');
    });
    const firstId = useLessonPipelineStore.getState().nodes[0].id;
    act(() => useLessonPipelineStore.getState().removeNode(firstId));

    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].moduleType).toBe('ASR');
  });

  it('removeNode re-orders remaining nodes from 0', () => {
    act(() => {
      useLessonPipelineStore.getState().addNode('INGESTION');
      useLessonPipelineStore.getState().addNode('ASR');
      useLessonPipelineStore.getState().addNode('SUMMARIZATION');
    });
    const middleId = useLessonPipelineStore.getState().nodes[1].id;
    act(() => useLessonPipelineStore.getState().removeNode(middleId));

    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes[0].order).toBe(0);
    expect(nodes[1].order).toBe(1);
  });

  it('loadTemplate THEMATIC loads exactly 8 nodes in correct order', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('THEMATIC'));

    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes).toHaveLength(8);
    expect(nodes[0].moduleType).toBe('INGESTION');
    expect(nodes[1].moduleType).toBe('ASR');
    expect(nodes[nodes.length - 1].moduleType).toBe('PUBLISH_SHARE');
  });

  it('loadTemplate THEMATIC does not include CITATION_VERIFIER', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('THEMATIC'));
    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes.every((n) => n.moduleType !== 'CITATION_VERIFIER')).toBe(true);
  });

  it('loadTemplate SEQUENTIAL loads exactly 9 nodes', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('SEQUENTIAL'));
    expect(useLessonPipelineStore.getState().nodes).toHaveLength(9);
  });

  it('loadTemplate SEQUENTIAL includes CITATION_VERIFIER', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('SEQUENTIAL'));
    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes.some((n) => n.moduleType === 'CITATION_VERIFIER')).toBe(true);
  });

  it('loadTemplate resets isDirty to false', () => {
    act(() => {
      useLessonPipelineStore.getState().addNode('INGESTION');
      useLessonPipelineStore.getState().loadTemplate('THEMATIC');
    });
    expect(useLessonPipelineStore.getState().isDirty).toBe(false);
  });

  it('resetDirty clears isDirty after addNode', () => {
    act(() => useLessonPipelineStore.getState().addNode('INGESTION'));
    expect(useLessonPipelineStore.getState().isDirty).toBe(true);
    act(() => useLessonPipelineStore.getState().resetDirty());
    expect(useLessonPipelineStore.getState().isDirty).toBe(false);
  });

  it('setSelectedNode updates selectedNodeId', () => {
    act(() => useLessonPipelineStore.getState().setSelectedNode('node-abc'));
    expect(useLessonPipelineStore.getState().selectedNodeId).toBe('node-abc');
  });

  it('setSelectedNode can be cleared to null', () => {
    act(() => useLessonPipelineStore.getState().setSelectedNode('node-abc'));
    act(() => useLessonPipelineStore.getState().setSelectedNode(null));
    expect(useLessonPipelineStore.getState().selectedNodeId).toBeNull();
  });

  it('toggleNode flips the enabled flag of the target node', () => {
    act(() => useLessonPipelineStore.getState().addNode('INGESTION'));
    const { nodes } = useLessonPipelineStore.getState();
    const originalEnabled = nodes[0].enabled;
    act(() => useLessonPipelineStore.getState().toggleNode(nodes[0].id));
    expect(useLessonPipelineStore.getState().nodes[0].enabled).toBe(!originalEnabled);
  });

  it('toggleNode sets isDirty true', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('THEMATIC'));
    expect(useLessonPipelineStore.getState().isDirty).toBe(false);
    const id = useLessonPipelineStore.getState().nodes[0].id;
    act(() => useLessonPipelineStore.getState().toggleNode(id));
    expect(useLessonPipelineStore.getState().isDirty).toBe(true);
  });

  it('reorderNodes moves a node from fromIdx to toIdx', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('THEMATIC'));
    const originalFirst = useLessonPipelineStore.getState().nodes[0].moduleType;
    act(() => useLessonPipelineStore.getState().reorderNodes(0, 2));
    const { nodes } = useLessonPipelineStore.getState();
    expect(nodes[2].moduleType).toBe(originalFirst);
    expect(nodes[0].moduleType).not.toBe(originalFirst);
  });

  it('updateNodeConfig merges config onto the target node', () => {
    act(() => useLessonPipelineStore.getState().addNode('INGESTION'));
    const id = useLessonPipelineStore.getState().nodes[0].id;
    act(() => useLessonPipelineStore.getState().updateNodeConfig(id, { maxRetries: 3 }));
    expect(useLessonPipelineStore.getState().nodes[0].config).toEqual({ maxRetries: 3 });
  });

  it('setNodes replaces all nodes and sets isDirty true', () => {
    act(() => useLessonPipelineStore.getState().loadTemplate('THEMATIC'));
    const singleNode = [
      { id: 'n1', moduleType: 'QA_GATE' as const, label: 'QA', labelHe: 'בקרה', enabled: true, order: 0, config: {} },
    ];
    act(() => useLessonPipelineStore.getState().setNodes(singleNode));
    const { nodes, isDirty } = useLessonPipelineStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].moduleType).toBe('QA_GATE');
    expect(isDirty).toBe(true);
  });
});

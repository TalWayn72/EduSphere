/**
 * Tests for lib/store.ts — Zustand state stores
 *
 * Covers: useUIStore initial state and actions,
 * useDocumentUIStore initial state and actions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, useDocumentUIStore } from './store';
import { AnnotationLayer } from '@/types/annotations';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUIStore.setState({
      sidebarOpen: true,
      activeAnnotationId: null,
      agentChatOpen: false,
      focusedAnnotationId: null,
    });
  });

  it('has correct initial state', () => {
    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.activeAnnotationId).toBeNull();
    expect(state.agentChatOpen).toBe(false);
    expect(state.focusedAnnotationId).toBeNull();
  });

  it('setSidebarOpen updates sidebarOpen', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().setSidebarOpen(true);
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setActiveAnnotationId updates activeAnnotationId', () => {
    useUIStore.getState().setActiveAnnotationId('ann-123');
    expect(useUIStore.getState().activeAnnotationId).toBe('ann-123');

    useUIStore.getState().setActiveAnnotationId(null);
    expect(useUIStore.getState().activeAnnotationId).toBeNull();
  });

  it('setAgentChatOpen updates agentChatOpen', () => {
    useUIStore.getState().setAgentChatOpen(true);
    expect(useUIStore.getState().agentChatOpen).toBe(true);

    useUIStore.getState().setAgentChatOpen(false);
    expect(useUIStore.getState().agentChatOpen).toBe(false);
  });

  it('setFocusedAnnotationId updates focusedAnnotationId', () => {
    useUIStore.getState().setFocusedAnnotationId('ann-456');
    expect(useUIStore.getState().focusedAnnotationId).toBe('ann-456');

    useUIStore.getState().setFocusedAnnotationId(null);
    expect(useUIStore.getState().focusedAnnotationId).toBeNull();
  });

  it('multiple actions do not interfere with each other', () => {
    useUIStore.getState().setSidebarOpen(false);
    useUIStore.getState().setAgentChatOpen(true);
    useUIStore.getState().setActiveAnnotationId('ann-789');

    const state = useUIStore.getState();
    expect(state.sidebarOpen).toBe(false);
    expect(state.agentChatOpen).toBe(true);
    expect(state.activeAnnotationId).toBe('ann-789');
    expect(state.focusedAnnotationId).toBeNull(); // unchanged
  });
});

describe('useDocumentUIStore', () => {
  beforeEach(() => {
    useDocumentUIStore.setState({
      documentZoom: 1,
      annotationPanelWidth: 35,
      defaultAnnotationLayer: AnnotationLayer.PERSONAL,
    });
  });

  it('has correct initial state', () => {
    const state = useDocumentUIStore.getState();
    expect(state.documentZoom).toBe(1);
    expect(state.annotationPanelWidth).toBe(35);
    expect(state.defaultAnnotationLayer).toBe(AnnotationLayer.PERSONAL);
  });

  it('setDocumentZoom updates documentZoom', () => {
    useDocumentUIStore.getState().setDocumentZoom(1.5);
    expect(useDocumentUIStore.getState().documentZoom).toBe(1.5);

    useDocumentUIStore.getState().setDocumentZoom(0.75);
    expect(useDocumentUIStore.getState().documentZoom).toBe(0.75);
  });

  it('setAnnotationPanelWidth updates annotationPanelWidth', () => {
    useDocumentUIStore.getState().setAnnotationPanelWidth(50);
    expect(useDocumentUIStore.getState().annotationPanelWidth).toBe(50);
  });

  it('setDefaultAnnotationLayer updates defaultAnnotationLayer', () => {
    useDocumentUIStore.getState().setDefaultAnnotationLayer(AnnotationLayer.INSTRUCTOR);
    expect(useDocumentUIStore.getState().defaultAnnotationLayer).toBe(AnnotationLayer.INSTRUCTOR);

    useDocumentUIStore.getState().setDefaultAnnotationLayer(AnnotationLayer.AI_GENERATED);
    expect(useDocumentUIStore.getState().defaultAnnotationLayer).toBe(AnnotationLayer.AI_GENERATED);
  });
});

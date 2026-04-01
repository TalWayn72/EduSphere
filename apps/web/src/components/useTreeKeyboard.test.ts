/**
 * useTreeKeyboard hook tests
 *
 * Verifies:
 *  1. getVisibleOrder returns roots only when nothing expanded
 *  2. getVisibleOrder includes children of expanded nodes
 *  3. ArrowDown moves focus to next visible node
 *  4. ArrowUp moves focus to previous visible node
 *  5. ArrowRight expands collapsed node with children
 *  6. ArrowRight moves to first child on already-expanded node
 *  7. ArrowLeft collapses expanded node
 *  8. ArrowLeft moves to parent when node is collapsed
 *  9. Enter/Space activates focused node
 * 10. Home focuses first visible node
 * 11. End focuses last visible node
 * 12. ArrowRight does nothing on leaf node
 * 13. Returns containerRef and handleKeyDown
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTreeKeyboard, getVisibleOrder } from './useTreeKeyboard';
import type { TreeKeyboardNode } from './useTreeKeyboard';

// ── Test data ──────────────────────────────────────────────────────────────────

const nodes: TreeKeyboardNode[] = [
  { id: 'root-1', children: ['child-1a', 'child-1b'], unlocked: true },
  { id: 'root-2', children: ['child-2a'], unlocked: true },
  { id: 'child-1a', children: [], unlocked: true },
  { id: 'child-1b', children: ['grandchild-1b1'], unlocked: true },
  { id: 'child-2a', children: [], unlocked: true },
  { id: 'grandchild-1b1', children: [], unlocked: true },
];

// ── getVisibleOrder tests ──────────────────────────────────────────────────────

describe('getVisibleOrder', () => {
  it('returns only roots when nothing is expanded', () => {
    const visible = getVisibleOrder(nodes, new Set());
    expect(visible).toEqual(['root-1', 'root-2']);
  });

  it('includes children of expanded nodes', () => {
    const visible = getVisibleOrder(nodes, new Set(['root-1']));
    expect(visible).toEqual(['root-1', 'child-1a', 'child-1b', 'root-2']);
  });

  it('includes nested children when parent chain expanded', () => {
    const visible = getVisibleOrder(nodes, new Set(['root-1', 'child-1b']));
    expect(visible).toEqual([
      'root-1',
      'child-1a',
      'child-1b',
      'grandchild-1b1',
      'root-2',
    ]);
  });

  it('handles empty nodes array', () => {
    expect(getVisibleOrder([], new Set())).toEqual([]);
  });
});

// ── useTreeKeyboard hook tests ────────────────────────────────────────────────

describe('useTreeKeyboard', () => {
  function makeKeyEvent(key: string): React.KeyboardEvent<HTMLDivElement> {
    return {
      key,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLDivElement>;
  }

  const defaultCallbacks = () => ({
    onFocus: vi.fn(),
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
    onActivate: vi.fn(),
  });

  it('returns containerRef and handleKeyDown', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );
    expect(result.current.containerRef).toBeDefined();
    expect(typeof result.current.handleKeyDown).toBe('function');
  });

  it('ArrowDown focuses next visible node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowDown'));
    expect(cbs.onFocus).toHaveBeenCalledWith('root-2');
  });

  it('ArrowDown does nothing at last node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-2',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowDown'));
    expect(cbs.onFocus).not.toHaveBeenCalled();
  });

  it('ArrowUp focuses previous visible node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-2',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowUp'));
    expect(cbs.onFocus).toHaveBeenCalledWith('root-1');
  });

  it('ArrowRight expands collapsed node with children', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowRight'));
    expect(cbs.onExpand).toHaveBeenCalledWith('root-1');
  });

  it('ArrowRight moves to first child on already-expanded node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(['root-1']),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowRight'));
    expect(cbs.onFocus).toHaveBeenCalledWith('child-1a');
  });

  it('ArrowRight does nothing on leaf node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(['root-1']),
        focusedId: 'child-1a',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowRight'));
    expect(cbs.onExpand).not.toHaveBeenCalled();
    expect(cbs.onFocus).not.toHaveBeenCalled();
  });

  it('ArrowLeft collapses expanded node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(['root-1']),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowLeft'));
    expect(cbs.onCollapse).toHaveBeenCalledWith('root-1');
  });

  it('ArrowLeft moves to parent when node is not expanded', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(['root-1']),
        focusedId: 'child-1a',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('ArrowLeft'));
    expect(cbs.onFocus).toHaveBeenCalledWith('root-1');
  });

  it('Enter activates focused node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('Enter'));
    expect(cbs.onActivate).toHaveBeenCalledWith('root-1');
  });

  it('Space activates focused node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent(' '));
    expect(cbs.onActivate).toHaveBeenCalledWith('root-1');
  });

  it('Home focuses first visible node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-2',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('Home'));
    expect(cbs.onFocus).toHaveBeenCalledWith('root-1');
  });

  it('End focuses last visible node', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('End'));
    expect(cbs.onFocus).toHaveBeenCalledWith('root-2');
  });

  it('unrecognized key does nothing', () => {
    const cbs = defaultCallbacks();
    const { result } = renderHook(() =>
      useTreeKeyboard({
        nodes,
        expandedIds: new Set(),
        focusedId: 'root-1',
        ...cbs,
      })
    );

    result.current.handleKeyDown(makeKeyEvent('Tab'));
    expect(cbs.onFocus).not.toHaveBeenCalled();
    expect(cbs.onExpand).not.toHaveBeenCalled();
    expect(cbs.onCollapse).not.toHaveBeenCalled();
    expect(cbs.onActivate).not.toHaveBeenCalled();
  });
});

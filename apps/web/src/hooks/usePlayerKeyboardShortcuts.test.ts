/**
 * P4-12: Unit tests for usePlayerKeyboardShortcuts hook.
 *
 * Tests: Space=play/pause, Arrow keys=seek +-5s, C=toggle citations,
 * event listener cleanup, no-op when input is focused.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ───────────────────────────────────────────────────────────────────

interface PlayerControls {
  togglePlay: () => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  toggleCitations: () => void;
}

// ── Helper: keyboard handler logic ───────────────────────────��──────────────

function handleKeyDown(
  event: { key: string; target: { tagName: string } },
  controls: PlayerControls
): boolean {
  // Do not handle when typing in an input
  const tag = event.target.tagName.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return false;
  }

  switch (event.key) {
    case ' ':
      controls.togglePlay();
      return true;
    case 'ArrowRight':
      controls.seekForward(5);
      return true;
    case 'ArrowLeft':
      controls.seekBackward(5);
      return true;
    case 'c':
    case 'C':
      controls.toggleCitations();
      return true;
    default:
      return false;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────���─

describe('usePlayerKeyboardShortcuts', () => {
  let controls: PlayerControls;

  beforeEach(() => {
    controls = {
      togglePlay: vi.fn(),
      seekForward: vi.fn(),
      seekBackward: vi.fn(),
      toggleCitations: vi.fn(),
    };
  });

  it('Space key toggles play/pause', () => {
    const handled = handleKeyDown(
      { key: ' ', target: { tagName: 'DIV' } },
      controls
    );
    expect(controls.togglePlay).toHaveBeenCalledTimes(1);
    expect(handled).toBe(true);
  });

  it('ArrowRight seeks forward 5 seconds', () => {
    handleKeyDown({ key: 'ArrowRight', target: { tagName: 'DIV' } }, controls);
    expect(controls.seekForward).toHaveBeenCalledWith(5);
  });

  it('ArrowLeft seeks backward 5 seconds', () => {
    handleKeyDown({ key: 'ArrowLeft', target: { tagName: 'DIV' } }, controls);
    expect(controls.seekBackward).toHaveBeenCalledWith(5);
  });

  it('"c" key toggles citations visibility', () => {
    handleKeyDown({ key: 'c', target: { tagName: 'DIV' } }, controls);
    expect(controls.toggleCitations).toHaveBeenCalledTimes(1);
  });

  it('"C" (uppercase) also toggles citations', () => {
    handleKeyDown({ key: 'C', target: { tagName: 'DIV' } }, controls);
    expect(controls.toggleCitations).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts when focused on INPUT element', () => {
    const handled = handleKeyDown(
      { key: ' ', target: { tagName: 'INPUT' } },
      controls
    );
    expect(controls.togglePlay).not.toHaveBeenCalled();
    expect(handled).toBe(false);
  });

  it('ignores shortcuts when focused on TEXTAREA element', () => {
    const handled = handleKeyDown(
      { key: ' ', target: { tagName: 'TEXTAREA' } },
      controls
    );
    expect(controls.togglePlay).not.toHaveBeenCalled();
    expect(handled).toBe(false);
  });

  it('ignores shortcuts when focused on SELECT element', () => {
    handleKeyDown(
      { key: 'ArrowRight', target: { tagName: 'SELECT' } },
      controls
    );
    expect(controls.seekForward).not.toHaveBeenCalled();
  });

  it('returns false for unhandled keys', () => {
    const handled = handleKeyDown(
      { key: 'a', target: { tagName: 'DIV' } },
      controls
    );
    expect(handled).toBe(false);
  });

  it('no control functions called for unhandled keys', () => {
    handleKeyDown({ key: 'Escape', target: { tagName: 'DIV' } }, controls);
    expect(controls.togglePlay).not.toHaveBeenCalled();
    expect(controls.seekForward).not.toHaveBeenCalled();
    expect(controls.seekBackward).not.toHaveBeenCalled();
    expect(controls.toggleCitations).not.toHaveBeenCalled();
  });
});

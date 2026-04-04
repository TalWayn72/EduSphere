/**
 * usePlayerKeyboardShortcuts — keyboard controls for YouTube player.
 *
 * Space/k = toggle play, Arrows = seek, c = toggle citations.
 * Inactive when an input/textarea/select is focused.
 */
import { useEffect } from 'react';

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const SEEK_SMALL = 5;
const SEEK_LARGE = 10;

interface KeyboardShortcutOptions {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  currentTime: number;
  isPlaying: boolean;
  toggleCitations?: () => void;
}

export function usePlayerKeyboardShortcuts({
  play,
  pause,
  seekTo,
  currentTime,
  isPlaying,
  toggleCitations,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName ?? '';
      if (INTERACTIVE_TAGS.has(tag)) return;
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (isPlaying) pause();
          else play();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          seekTo(Math.max(0, currentTime - SEEK_SMALL));
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          seekTo(currentTime + SEEK_SMALL);
          break;
        case 'ArrowUp':
          e.preventDefault();
          seekTo(currentTime + SEEK_LARGE);
          break;
        case 'ArrowDown':
          e.preventDefault();
          seekTo(Math.max(0, currentTime - SEEK_LARGE));
          break;
        case 'c':
          toggleCitations?.();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [play, pause, seekTo, currentTime, isPlaying, toggleCitations]);
}

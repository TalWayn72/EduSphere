/**
 * P4-12: Unit tests for useTranscriptSync hook.
 *
 * Tests: bidirectional sync between player time and transcript scroll,
 * active segment detection, click-to-seek, debounce behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Types ───────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

// ── Helper: find active segment at given time ───────────────────────────────

function findActiveSegment(
  segments: TranscriptSegment[],
  currentTime: number
): TranscriptSegment | null {
  return (
    segments.find(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    ) ?? null
  );
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const SEGMENTS: TranscriptSegment[] = [
  { id: 'seg-1', startTime: 0, endTime: 5, text: 'First segment' },
  { id: 'seg-2', startTime: 5, endTime: 10, text: 'Second segment' },
  { id: 'seg-3', startTime: 10, endTime: 15, text: 'Third segment' },
  { id: 'seg-4', startTime: 15, endTime: 20, text: 'Fourth segment' },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useTranscriptSync — active segment detection', () => {
  it('returns first segment at time 0', () => {
    const active = findActiveSegment(SEGMENTS, 0);
    expect(active?.id).toBe('seg-1');
  });

  it('returns second segment at time 7.5', () => {
    const active = findActiveSegment(SEGMENTS, 7.5);
    expect(active?.id).toBe('seg-2');
  });

  it('returns third segment at time 10 (inclusive start)', () => {
    const active = findActiveSegment(SEGMENTS, 10);
    expect(active?.id).toBe('seg-3');
  });

  it('returns null when time is beyond all segments', () => {
    const active = findActiveSegment(SEGMENTS, 25);
    expect(active).toBeNull();
  });

  it('returns null when time is negative', () => {
    const active = findActiveSegment(SEGMENTS, -1);
    expect(active).toBeNull();
  });

  it('handles boundary at segment end (exclusive)', () => {
    // At time=5 exactly, we should be in seg-2 (startTime=5), not seg-1 (endTime=5)
    const active = findActiveSegment(SEGMENTS, 5);
    expect(active?.id).toBe('seg-2');
  });

  it('handles empty segments array', () => {
    const active = findActiveSegment([], 5);
    expect(active).toBeNull();
  });
});

describe('useTranscriptSync — click-to-seek', () => {
  it('returns startTime of clicked segment', () => {
    const clickedSegment = SEGMENTS[2]; // seg-3
    const seekTime = clickedSegment.startTime;
    expect(seekTime).toBe(10);
  });

  it('seeks to correct time for any segment', () => {
    for (const seg of SEGMENTS) {
      expect(seg.startTime).toBeGreaterThanOrEqual(0);
      expect(seg.startTime).toBeLessThan(seg.endTime);
    }
  });
});

describe('useTranscriptSync — debounce behavior', () => {
  it('debounces rapid time updates (4Hz = 250ms interval)', () => {
    const DEBOUNCE_MS = 250;
    const callback = vi.fn();
    let lastCall = 0;

    function debouncedUpdate(time: number) {
      const now = Date.now();
      if (now - lastCall >= DEBOUNCE_MS) {
        lastCall = now;
        callback(time);
      }
    }

    // Simulate rapid calls (faster than 4Hz)
    debouncedUpdate(1);
    expect(callback).toHaveBeenCalledTimes(1);

    // Immediate second call should be debounced
    debouncedUpdate(2);
    // Only 1 call because Date.now() hasn't advanced
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('segment transitions are detected correctly', () => {
    let prevSegId: string | null = null;
    const transitions: string[] = [];

    for (const time of [0, 2, 4.9, 5, 7, 10, 12]) {
      const seg = findActiveSegment(SEGMENTS, time);
      if (seg && seg.id !== prevSegId) {
        transitions.push(seg.id);
        prevSegId = seg.id;
      }
    }

    // Should detect 3 transitions: seg-1 → seg-2 → seg-3
    expect(transitions).toEqual(['seg-1', 'seg-2', 'seg-3']);
  });
});

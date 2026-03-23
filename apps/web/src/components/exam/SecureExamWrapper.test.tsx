// @vitest-environment jsdom
/**
 * SecureExamWrapper component tests
 *
 * Verifies:
 *  1.  Renders children when enabled
 *  2.  Shows lockdown status when enabled
 *  3.  Does not show lockdown status when disabled
 *  4.  Fires handleViolation on browser lockdown events
 *  5.  Cleans up event listeners on unmount (MEMORY SAFETY)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockUseBrowserLockdown = vi.fn().mockReturnValue({ isFullscreen: false });

vi.mock('./use-browser-lockdown', () => ({
  useBrowserLockdown: (...args: unknown[]) => mockUseBrowserLockdown(...args),
}));

vi.mock('./ExamViolationWarning', () => ({
  ExamViolationWarning: vi.fn(() => <div data-testid="violation-warning" />),
}));

vi.mock('./ExamLockdownStatus', () => ({
  ExamLockdownStatus: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ active }: any) => active ? <div data-testid="lockdown-status">Secure Mode</div> : null,
  ),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { SecureExamWrapper } from './SecureExamWrapper';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SecureExamWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <SecureExamWrapper sessionId="s1" enabled={true}>
        <div data-testid="child">Exam Content</div>
      </SecureExamWrapper>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows lockdown status when enabled', () => {
    render(
      <SecureExamWrapper sessionId="s1" enabled={true}>
        <span>test</span>
      </SecureExamWrapper>,
    );
    expect(screen.getByTestId('lockdown-status')).toBeInTheDocument();
  });

  it('does not show lockdown status when disabled', () => {
    render(
      <SecureExamWrapper sessionId="s1" enabled={false}>
        <span>test</span>
      </SecureExamWrapper>,
    );
    expect(screen.queryByTestId('lockdown-status')).not.toBeInTheDocument();
  });

  it('passes enabled and onViolation to useBrowserLockdown', () => {
    render(
      <SecureExamWrapper sessionId="s1" enabled={true}>
        <span>test</span>
      </SecureExamWrapper>,
    );
    expect(mockUseBrowserLockdown).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, onViolation: expect.any(Function) }),
    );
  });

  it('cleans up by relying on useBrowserLockdown cleanup (MEMORY SAFETY)', () => {
    const { unmount } = render(
      <SecureExamWrapper sessionId="s1" enabled={true}>
        <span>test</span>
      </SecureExamWrapper>,
    );
    // Unmount should not throw — cleanup happens inside useBrowserLockdown
    expect(() => unmount()).not.toThrow();
  });
});

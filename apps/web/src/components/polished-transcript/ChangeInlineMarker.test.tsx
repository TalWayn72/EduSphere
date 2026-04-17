/**
 * Unit tests for ChangeInlineMarker.
 *
 * Tests: renders pending/accepted/rejected states, accept/reject button clicks,
 * RTL direction, disabled state, accessibility labels.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PolishedChange } from './polished-transcript.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'polishedTranscript.acceptChange': 'Accept this change',
        'polishedTranscript.rejectChange': 'Reject this change',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
    'data-testid': testId,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    'data-testid'?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  Check: () => <svg data-testid="check-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

import { ChangeInlineMarker } from './ChangeInlineMarker';

const PENDING_CHANGE: PolishedChange = {
  id: 'chg-1',
  changeType: 'FILLER_REMOVED',
  originalText: 'אמממ',
  replacementText: '',
  charOffsetStart: 0,
  charOffsetEnd: 4,
  decision: 'PENDING',
};

const GRAMMAR_CHANGE: PolishedChange = {
  id: 'chg-2',
  changeType: 'GRAMMAR_FIXED',
  originalText: 'הלך',
  replacementText: 'הלכה',
  charOffsetStart: 10,
  charOffsetEnd: 13,
  decision: 'PENDING',
};

describe('ChangeInlineMarker', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('PENDING state', () => {
    it('renders original with strikethrough', () => {
      render(
        <ChangeInlineMarker
          change={PENDING_CHANGE}
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      const del = document.querySelector('del');
      expect(del).toBeInTheDocument();
      expect(del?.textContent).toBe('אמממ');
    });

    it('renders accept and reject buttons', () => {
      render(
        <ChangeInlineMarker
          change={PENDING_CHANGE}
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.getByTestId('accept-change-btn')).toBeInTheDocument();
      expect(screen.getByTestId('reject-change-btn')).toBeInTheDocument();
    });

    it('calls onAccept with change id when accept clicked', async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      render(
        <ChangeInlineMarker
          change={PENDING_CHANGE}
          onAccept={onAccept}
          onReject={vi.fn()}
        />
      );
      await user.click(screen.getByTestId('accept-change-btn'));
      expect(onAccept).toHaveBeenCalledWith('chg-1');
    });

    it('calls onReject with change id when reject clicked', async () => {
      const user = userEvent.setup();
      const onReject = vi.fn();
      render(
        <ChangeInlineMarker
          change={PENDING_CHANGE}
          onAccept={vi.fn()}
          onReject={onReject}
        />
      );
      await user.click(screen.getByTestId('reject-change-btn'));
      expect(onReject).toHaveBeenCalledWith('chg-1');
    });

    it('disables buttons when disabled=true', () => {
      render(
        <ChangeInlineMarker
          change={PENDING_CHANGE}
          onAccept={vi.fn()}
          onReject={vi.fn()}
          disabled
        />
      );
      expect(screen.getByTestId('accept-change-btn')).toBeDisabled();
      expect(screen.getByTestId('reject-change-btn')).toBeDisabled();
    });

    it('renders both original and replacement for grammar fix', () => {
      render(
        <ChangeInlineMarker
          change={GRAMMAR_CHANGE}
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(document.querySelector('del')?.textContent).toBe('הלך');
      expect(document.querySelector('ins')?.textContent).toBe('הלכה');
    });
  });

  describe('ACCEPTED state (via localDecision)', () => {
    it('shows replacement text in green mark', () => {
      render(
        <ChangeInlineMarker
          change={GRAMMAR_CHANGE}
          localDecision="ACCEPTED"
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.getByTestId('change-accepted')).toBeInTheDocument();
      expect(screen.getByTestId('change-accepted').textContent).toBe('הלכה');
    });

    it('does not render action buttons', () => {
      render(
        <ChangeInlineMarker
          change={GRAMMAR_CHANGE}
          localDecision="ACCEPTED"
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.queryByTestId('accept-change-btn')).not.toBeInTheDocument();
    });
  });

  describe('REJECTED state (via localDecision)', () => {
    it('shows original text in muted span', () => {
      render(
        <ChangeInlineMarker
          change={GRAMMAR_CHANGE}
          localDecision="REJECTED"
          onAccept={vi.fn()}
          onReject={vi.fn()}
        />
      );
      expect(screen.getByTestId('change-rejected')).toBeInTheDocument();
      expect(screen.getByTestId('change-rejected').textContent).toBe('הלך');
    });
  });

  it('has correct data-change-type attribute', () => {
    render(
      <ChangeInlineMarker
        change={PENDING_CHANGE}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByTestId('change-pending')).toHaveAttribute(
      'data-change-type',
      'FILLER_REMOVED'
    );
  });
});

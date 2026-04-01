/**
 * ExamLockdownStatus component tests
 *
 * Verifies:
 *  1. Returns null when not active
 *  2. Renders "Secure Mode Active" when active
 *  3. Shows green styling with no violations
 *  4. Shows amber styling with violations
 *  5. Has correct aria-label
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamLockdownStatus } from './ExamLockdownStatus';

describe('ExamLockdownStatus', () => {
  it('returns null when not active', () => {
    const { container } = render(
      <ExamLockdownStatus active={false} violationCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Secure Mode Active" text when active', () => {
    render(<ExamLockdownStatus active={true} violationCount={0} />);
    expect(screen.getByText('Secure Mode Active')).toBeInTheDocument();
  });

  it('has status role', () => {
    render(<ExamLockdownStatus active={true} violationCount={0} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows emerald styling when no violations', () => {
    render(<ExamLockdownStatus active={true} violationCount={0} />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('emerald');
  });

  it('shows amber styling when violations exist', () => {
    render(<ExamLockdownStatus active={true} violationCount={2} />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('amber');
  });

  it('has aria-label with violation count', () => {
    render(<ExamLockdownStatus active={true} violationCount={3} />);
    expect(
      screen.getByLabelText('Secure mode active — 3 violation(s)')
    ).toBeInTheDocument();
  });

  it('has clean aria-label when no violations', () => {
    render(<ExamLockdownStatus active={true} violationCount={0} />);
    expect(screen.getByLabelText('Secure mode active')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ExamLockdownStatus
        active={true}
        violationCount={0}
        className="my-class"
      />
    );
    const el = screen.getByRole('status');
    expect(el.className).toContain('my-class');
  });
});

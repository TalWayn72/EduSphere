/**
 * ExamTimer component tests
 *
 * Verifies:
 *  1.  Renders formatted time string
 *  2.  Shows green styling for normal time
 *  3.  Shows yellow styling for warning (≤10 min)
 *  4.  Shows red styling for critical (≤5 min)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamTimer } from './ExamTimer';

describe('ExamTimer', () => {
  it('renders the formatted time string', () => {
    render(
      <ExamTimer formattedTime="45:00" isWarning={false} isCritical={false} timeRemaining={2700} />,
    );
    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('has green styling when neither warning nor critical', () => {
    const { container } = render(
      <ExamTimer formattedTime="30:00" isWarning={false} isCritical={false} timeRemaining={1800} />,
    );
    const badge = container.querySelector('[aria-live="polite"]');
    expect(badge?.className).toContain('green');
    expect(badge?.className).not.toContain('yellow');
    expect(badge?.className).not.toContain('red');
  });

  it('has yellow styling during warning phase', () => {
    const { container } = render(
      <ExamTimer formattedTime="08:00" isWarning={true} isCritical={false} timeRemaining={480} />,
    );
    const badge = container.querySelector('[aria-live="polite"]');
    expect(badge?.className).toContain('yellow');
  });

  it('has red styling during critical phase', () => {
    const { container } = render(
      <ExamTimer formattedTime="02:00" isWarning={false} isCritical={true} timeRemaining={120} />,
    );
    const badge = container.querySelector('[aria-live="polite"]');
    expect(badge?.className).toContain('red');
  });

  it('has aria-label with time remaining', () => {
    render(
      <ExamTimer formattedTime="15:30" isWarning={false} isCritical={false} timeRemaining={930} />,
    );
    expect(screen.getByLabelText('Time remaining: 15:30')).toBeInTheDocument();
  });

  it('adds pulse animation when time ≤ 60s', () => {
    const { container } = render(
      <ExamTimer formattedTime="00:45" isWarning={false} isCritical={true} timeRemaining={45} />,
    );
    const badge = container.querySelector('[aria-live="polite"]');
    expect(badge?.className).toContain('animate-pulse');
  });
});

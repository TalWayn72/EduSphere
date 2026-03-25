/**
 * ExamViolationWarning component tests
 *
 * Verifies:
 *  1. Renders warning title for non-voided state
 *  2. Renders voided title when isVoided
 *  3. Shows violation description based on type
 *  4. Shows violation count
 *  5. Dismiss button calls onDismiss
 *  6. Button text changes when voided
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExamViolationWarning } from './ExamViolationWarning';

describe('ExamViolationWarning', () => {
  const defaultProps = {
    open: true,
    violationType: 'TAB_SWITCH',
    violationCount: 1,
    maxViolations: 3,
    isVoided: false,
    onDismiss: vi.fn(),
  };

  it('renders warning title when not voided', () => {
    render(<ExamViolationWarning {...defaultProps} />);
    expect(screen.getByText('Warning: Exam Integrity Violation Detected')).toBeInTheDocument();
  });

  it('renders voided title when isVoided', () => {
    render(<ExamViolationWarning {...defaultProps} isVoided={true} />);
    expect(screen.getByText('Exam Voided')).toBeInTheDocument();
  });

  it('shows description for TAB_SWITCH violation', () => {
    render(<ExamViolationWarning {...defaultProps} />);
    expect(screen.getByText('You navigated away from the exam tab.')).toBeInTheDocument();
  });

  it('shows description for CLIPBOARD_ATTEMPT', () => {
    render(<ExamViolationWarning {...defaultProps} violationType="CLIPBOARD_ATTEMPT" />);
    expect(screen.getByText('A clipboard operation was attempted.')).toBeInTheDocument();
  });

  it('shows fallback description for unknown violation type', () => {
    render(<ExamViolationWarning {...defaultProps} violationType="UNKNOWN_TYPE" />);
    expect(screen.getByText('An integrity violation was detected.')).toBeInTheDocument();
  });

  it('shows violation count when not voided', () => {
    render(<ExamViolationWarning {...defaultProps} violationCount={2} />);
    expect(screen.getByText('Warning 2 of 3')).toBeInTheDocument();
  });

  it('does not show violation count when voided', () => {
    render(<ExamViolationWarning {...defaultProps} isVoided={true} />);
    expect(screen.queryByText(/Warning \d+ of/)).not.toBeInTheDocument();
  });

  it('shows "I understand" button when not voided', () => {
    render(<ExamViolationWarning {...defaultProps} />);
    expect(screen.getByText('I understand')).toBeInTheDocument();
  });

  it('shows "Return to Dashboard" button when voided', () => {
    render(<ExamViolationWarning {...defaultProps} isVoided={true} />);
    expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
  });

  it('calls onDismiss when button clicked', () => {
    const onDismiss = vi.fn();
    render(<ExamViolationWarning {...defaultProps} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('I understand'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

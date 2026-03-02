import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// AnnotationPanel has heavy urql/subscription deps — mock it
vi.mock('@/components/AnnotationPanel', () => ({
  AnnotationPanel: ({
    contentId,
    currentUserRole,
  }: {
    contentId: string;
    currentUserId: string;
    currentUserRole: string;
    contentTimestamp?: number;
  }) => (
    <div
      data-testid="annotation-panel"
      data-content-id={contentId}
      data-role={currentUserRole}
    />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import AnnotationDemo from './AnnotationDemo';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnotationDemo', () => {
  it('renders the page heading', () => {
    render(<AnnotationDemo />);
    expect(
      screen.getByRole('heading', { name: /Annotation System Demo/i })
    ).toBeInTheDocument();
  });

  it('renders the subtitle description', () => {
    render(<AnnotationDemo />);
    expect(screen.getByText(/4-layer annotation system/i)).toBeInTheDocument();
  });

  it('renders simulated video content area', () => {
    render(<AnnotationDemo />);
    expect(screen.getByText('Video Content')).toBeInTheDocument();
  });

  it('renders the video credit — Introduction to Logic', () => {
    render(<AnnotationDemo />);
    // Multiple elements match — use getAllByText and check at least one exists
    const matches = screen.getAllByText(/Introduction to Logic/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the lecture title heading', () => {
    render(<AnnotationDemo />);
    expect(
      screen.getByText(/Introduction to Logical Reasoning/i)
    ).toBeInTheDocument();
  });

  it('renders the description prose text', () => {
    render(<AnnotationDemo />);
    expect(
      screen.getByText(/deductive and inductive arguments/i)
    ).toBeInTheDocument();
  });

  it('renders AnnotationPanel with correct props', () => {
    render(<AnnotationDemo />);
    const panel = screen.getByTestId('annotation-panel');
    expect(panel).toHaveAttribute('data-content-id', 'content-1');
    expect(panel).toHaveAttribute('data-role', 'student');
  });

  it('renders all 4 feature highlight cards', () => {
    render(<AnnotationDemo />);
    expect(screen.getByText('Private Notes')).toBeInTheDocument();
    expect(screen.getByText('Public Discussion')).toBeInTheDocument();
    expect(screen.getByText('Instructor Guidance')).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  it('renders the instructor note callout', () => {
    render(<AnnotationDemo />);
    expect(screen.getByText(/Instructor Note/i)).toBeInTheDocument();
  });

  it('renders the Key Topics list items', () => {
    render(<AnnotationDemo />);
    expect(screen.getByText(/Modus ponens/i)).toBeInTheDocument();
    expect(screen.getByText(/Validity vs. soundness/i)).toBeInTheDocument();
  });
});

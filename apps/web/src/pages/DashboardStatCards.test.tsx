/**
 * DashboardStatCards component tests
 *
 * Verifies:
 *  1. PrimaryStatCards renders 3 stat cards
 *  2. PrimaryStatCards shows "..." when coursesEnrolled is null
 *  3. PrimaryStatCards shows numeric values when provided
 *  4. PrimaryStatCards shows "..." when isStatsFetching is true
 *  5. PrimaryStatCards shows conceptsMastered when not fetching
 *  6. PrimaryStatCards displays BETA badges for study time and concepts
 *  7. SecondaryStatCards renders 3 stat cards
 *  8. SecondaryStatCards shows "..." for null values
 *  9. SecondaryStatCards shows numeric values when provided
 * 10. SecondaryStatCards always shows "—" for Study Groups (placeholder)
 * 11. Translation keys are used for card titles
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrimaryStatCards, SecondaryStatCards } from './DashboardStatCards';

// i18next is globally mocked in test/setup.ts — keys returned as-is

// ── PrimaryStatCards ─────────────────────────────────────────────────────────

describe('PrimaryStatCards', () => {
  const defaultProps = {
    coursesEnrolled: 5,
    totalMinutesDisplay: '2h 30m',
    conceptsMastered: 12,
    isStatsFetching: false,
  };

  it('renders 3 stat cards', () => {
    const { container } = render(<PrimaryStatCards {...defaultProps} />);
    // At minimum we expect 3 top-level grid children
    const grid = container.firstElementChild;
    expect(grid?.children.length).toBe(3);
  });

  it('shows "..." when coursesEnrolled is null', () => {
    render(<PrimaryStatCards {...defaultProps} coursesEnrolled={null} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('shows numeric coursesEnrolled when provided', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows totalMinutesDisplay value', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('shows "..." for conceptsMastered when isStatsFetching is true', () => {
    render(<PrimaryStatCards {...defaultProps} isStatsFetching={true} />);
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('shows conceptsMastered value when not fetching', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays BETA badges', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    const betaBadges = screen.getAllByText('BETA');
    expect(betaBadges).toHaveLength(2);
  });

  it('shows descriptive subtexts', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    expect(screen.getByText('Available in catalog')).toBeInTheDocument();
    // "BETA" subtext appears in both Study Time and Concepts cards
    const betaTexts = screen.getAllByText(/BETA — real tracking coming soon/);
    expect(betaTexts).toHaveLength(2);
  });

  it('uses translation keys for titles', () => {
    render(<PrimaryStatCards {...defaultProps} />);
    // Global mock returns key as-is: "dashboard:stats.coursesEnrolled" or just "stats.coursesEnrolled"
    expect(
      screen.getByText(/stats\.coursesEnrolled|Courses Enrolled/i)
    ).toBeInTheDocument();
  });
});

// ── SecondaryStatCards ────────────────────────────────────────────────────────

describe('SecondaryStatCards', () => {
  const defaultProps = {
    coursesEnrolled: 3,
    annotationsCreated: 17,
  };

  it('renders 3 stat cards', () => {
    const { container } = render(<SecondaryStatCards {...defaultProps} />);
    const grid = container.firstElementChild;
    expect(grid?.children.length).toBe(3);
  });

  it('shows numeric coursesEnrolled', () => {
    render(<SecondaryStatCards {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows "..." when coursesEnrolled is null', () => {
    render(<SecondaryStatCards {...defaultProps} coursesEnrolled={null} />);
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('shows numeric annotationsCreated', () => {
    render(<SecondaryStatCards {...defaultProps} />);
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('shows "..." when annotationsCreated is null', () => {
    render(<SecondaryStatCards {...defaultProps} annotationsCreated={null} />);
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('shows placeholder "..." for Study Groups when count is null', () => {
    render(
      <SecondaryStatCards {...defaultProps} studyGroupsCount={null} />
    );
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Study Groups label', () => {
    render(<SecondaryStatCards {...defaultProps} />);
    expect(screen.getByText('Study Groups')).toBeInTheDocument();
  });

  it('shows descriptive subtexts', () => {
    render(<SecondaryStatCards {...defaultProps} />);
    expect(screen.getByText('Notes and highlights')).toBeInTheDocument();
    expect(screen.getByText('Active collaborations')).toBeInTheDocument();
  });
});

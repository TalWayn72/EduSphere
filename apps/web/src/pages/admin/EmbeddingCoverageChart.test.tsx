/**
 * Tests for EmbeddingCoverageChart component.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { EmbeddingCoverageChart } from './EmbeddingCoverageChart';
import type { CourseBreakdown } from './EmbeddingDashboardPage.stats';

function makeCourse(
  overrides: Partial<CourseBreakdown> & { courseId: string }
): CourseBreakdown {
  return {
    courseTitle: `Course ${overrides.courseId}`,
    sourceCount: 10,
    indexedCount: 10,
    chunkCount: 100,
    ...overrides,
  };
}

describe('EmbeddingCoverageChart', () => {
  it('renders empty state when no courses', () => {
    render(<EmbeddingCoverageChart courses={[]} />);
    expect(
      screen.getByText(/No courses with embedding data/)
    ).toBeInTheDocument();
  });

  it('renders a bar for each course', () => {
    const courses = [
      makeCourse({ courseId: 'c1' }),
      makeCourse({ courseId: 'c2' }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    expect(screen.getByTestId('coverage-bar-c1')).toBeInTheDocument();
    expect(screen.getByTestId('coverage-bar-c2')).toBeInTheDocument();
  });

  it('shows green bar for >80% coverage', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 9 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByTestId('coverage-bar-c1');
    expect(within(bar).getByText('90%')).toBeInTheDocument();
    const progressbar = within(bar).getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '90');
  });

  it('shows yellow bar for 40-80% coverage', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 5 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByTestId('coverage-bar-c1');
    expect(within(bar).getByText('50%')).toBeInTheDocument();
  });

  it('shows red bar for <40% coverage', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 2 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByTestId('coverage-bar-c1');
    expect(within(bar).getByText('20%')).toBeInTheDocument();
  });

  it('handles 0 sourceCount gracefully (0%)', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 0, indexedCount: 0 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByTestId('coverage-bar-c1');
    expect(within(bar).getByText('0%')).toBeInTheDocument();
    expect(within(bar).getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
  });

  it('has accessible progressbar roles', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 8 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '80');
    expect(progressbar).toHaveAttribute(
      'aria-label',
      expect.stringContaining('80%')
    );
  });

  it('renders a role=list container with proper label', () => {
    const courses = [makeCourse({ courseId: 'c1' })];
    render(<EmbeddingCoverageChart courses={courses} />);
    expect(screen.getByRole('list')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('coverage')
    );
  });

  it('shows indexed/total count per course', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 7 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    expect(screen.getByText(/7\/10/)).toBeInTheDocument();
    expect(screen.getByText(/sources indexed/)).toBeInTheDocument();
  });

  it('renders the chart container with testid', () => {
    const courses = [makeCourse({ courseId: 'c1' })];
    render(<EmbeddingCoverageChart courses={courses} />);
    expect(screen.getByTestId('embedding-coverage-chart')).toBeInTheDocument();
  });
});

describe('EmbeddingCoverageChart — Accessibility', () => {
  it('progressbar has aria-valuemin, aria-valuemax, and aria-valuenow', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 7 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '70');
  });

  it('progressbar has descriptive aria-label with percentage', () => {
    const courses = [
      makeCourse({ courseId: 'c1', sourceCount: 10, indexedCount: 8 }),
    ];
    render(<EmbeddingCoverageChart courses={courses} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('80%'));
  });

  it('list container has role="list" with descriptive aria-label', () => {
    const courses = [makeCourse({ courseId: 'c1' })];
    render(<EmbeddingCoverageChart courses={courses} />);
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute(
      'aria-label',
      expect.stringContaining('coverage')
    );
  });
});

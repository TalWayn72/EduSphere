import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { CourseProgress, WeeklyStats } from '@/lib/mock-analytics';
import { LearningStats } from './LearningStats';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_COURSES: CourseProgress[] = [
  {
    id: 'c1',
    title: 'Introduction to Talmud',
    progress: 65,
    lastStudied: '2024-01-10',
    totalMinutes: 180,
  },
  {
    id: 'c2',
    title: 'Advanced Hebrew',
    progress: 30,
    lastStudied: '2024-01-12',
    totalMinutes: 90,
  },
];

const MOCK_WEEKLY: WeeklyStats[] = [
  {
    week: 'Mon',
    studyMinutes: 60,
    quizzesTaken: 2,
    annotationsAdded: 3,
    aiSessions: 1,
  },
  {
    week: 'Tue',
    studyMinutes: 90,
    quizzesTaken: 1,
    annotationsAdded: 5,
    aiSessions: 2,
  },
  {
    week: 'Wed',
    studyMinutes: 45,
    quizzesTaken: 0,
    annotationsAdded: 1,
    aiSessions: 0,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LearningStats', () => {
  it('renders course titles in the Course Progress card', () => {
    render(<LearningStats courses={MOCK_COURSES} weeklyStats={MOCK_WEEKLY} />);
    expect(screen.getByText('Introduction to Talmud')).toBeInTheDocument();
    expect(screen.getByText('Advanced Hebrew')).toBeInTheDocument();
  });

  it('renders progress percentages for each course', () => {
    render(<LearningStats courses={MOCK_COURSES} weeklyStats={MOCK_WEEKLY} />);
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders weekly sparkline bars (one per week entry)', () => {
    const { container } = render(
      <LearningStats courses={MOCK_COURSES} weeklyStats={MOCK_WEEKLY} />
    );
    // Each SparklineBar has a title attribute on its wrapper div
    const barWrappers = container.querySelectorAll('[title]');
    // 3 SparklineBars + any CourseProgressBar titles
    expect(barWrappers.length).toBeGreaterThanOrEqual(3);
  });

  it('SparklineBar pct=0 when all studyMinutes are 0 (line 18 false branch: max > 0 → false)', () => {
    const zeroStats: WeeklyStats[] = [
      {
        week: 'Mon',
        studyMinutes: 0,
        quizzesTaken: 0,
        annotationsAdded: 0,
        aiSessions: 0,
      },
      {
        week: 'Tue',
        studyMinutes: 0,
        quizzesTaken: 0,
        annotationsAdded: 0,
        aiSessions: 0,
      },
    ];
    // maxMinutes = Math.max(0, 0) = 0 → SparklineBar receives max=0
    // → pct = max > 0 ? ... : 0  (the false branch is now covered)
    const { container } = render(
      <LearningStats courses={MOCK_COURSES} weeklyStats={zeroStats} />
    );
    expect(container).toBeInTheDocument();
    // The inner pct bar should have height '0%'
    const progressInner = container.querySelectorAll('.absolute.bottom-0');
    progressInner.forEach((el) => {
      expect((el as HTMLElement).style.height).toBe('0%');
    });
  });

  it('renders best week minutes label in the summary section', () => {
    render(<LearningStats courses={MOCK_COURSES} weeklyStats={MOCK_WEEKLY} />);
    // bestWeek = Math.max(60, 90, 45) = 90 — rendered as "90 min" in a <p>
    // Use regex to match the "90" part since the element text includes " min"
    expect(screen.getByText(/^90/)).toBeInTheDocument();
  });

  it('renders with empty courses list (no CourseProgressBar rendered)', () => {
    const { container } = render(
      <LearningStats courses={[]} weeklyStats={MOCK_WEEKLY} />
    );
    expect(container).toBeInTheDocument();
    expect(
      screen.queryByText('Introduction to Talmud')
    ).not.toBeInTheDocument();
  });

  it('renders totalMinutes converted to hours in CourseProgressBar', () => {
    const { container } = render(
      <LearningStats courses={MOCK_COURSES} weeklyStats={MOCK_WEEKLY} />
    );
    // MOCK_COURSES[0].totalMinutes = 180 → Math.round(180/60) = 3 → "3h …"
    // Find a paragraph that contains "3h"
    const paragraphs = container.querySelectorAll('p.text-xs');
    const hasHours = Array.from(paragraphs).some((p) =>
      p.textContent?.includes('3h')
    );
    expect(hasHours).toBe(true);
  });
});

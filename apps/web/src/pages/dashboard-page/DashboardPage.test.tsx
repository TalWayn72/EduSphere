import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en', changeLanguage: vi.fn() } }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/MasteryBadge', () => ({
  MasteryBadge: () => <span data-testid="mastery-badge" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('./CourseCard', () => ({
  CourseCard: () => <div data-testid="course-card" />,
}));

vi.mock('./ActivityIcon', () => ({
  ActivityIcon: () => <span data-testid="activity-icon" />,
}));

vi.mock('./useDashboardData', () => ({
  useDashboardData: () => ({
    displayName: 'Test User',
    showOnboardingBanner: false,
    setOnboardingDismissed: vi.fn(),
    enrolledCount: 5,
    completedCount: 2,
    inProgressCourses: [],
    recommendedCourses: [],
    activity: [],
    streak: 3,
    xp: 500,
    level: 5,
    masteryTopics: [],
  }),
}));

import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inside Layout', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

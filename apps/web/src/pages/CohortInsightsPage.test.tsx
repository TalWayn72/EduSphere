import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn().mockResolvedValue({ error: null })]),
  useSubscription: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/cohort-insights/CohortInsightsWidget', () => ({
  CohortInsightsWidget: (props: Record<string, unknown>) => (
    <div data-testid="cohort-insights-widget" data-concept-id={props.conceptId} data-course-id={props.courseId}>
      CohortInsightsWidget Mock
    </div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'u-1', username: 'testuser', email: 'test@example.com',
    firstName: 'Alice', lastName: 'Smith', tenantId: 't-1',
    role: 'STUDENT', scopes: ['read'],
  })),
  DEV_MODE: true,
  logout: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    resolvedMode: 'light', setThemeMode: vi.fn(), tenantPrimitives: {},
    userPreferences: { mode: 'system', fontSize: 'md', readingMode: false, motionPreference: 'full', contrastMode: 'normal' },
    setTenantTheme: vi.fn(), setFontSize: vi.fn(), setReadingMode: vi.fn(),
    setMotionPreference: vi.fn(), previewThemeChanges: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

import { CohortInsightsPage } from './CohortInsightsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <CohortInsightsPage />
    </MemoryRouter>
  );

describe('CohortInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders page title heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('displays translated title text', () => {
    renderPage();
    expect(screen.getByText('Cohort Insights')).toBeInTheDocument();
  });

  it('displays translated subtitle text', () => {
    renderPage();
    expect(screen.getByText('Discover how past cohorts approached the same concepts')).toBeInTheDocument();
  });

  it('renders CohortInsightsWidget', () => {
    renderPage();
    expect(screen.getByTestId('cohort-insights-widget')).toBeInTheDocument();
  });

  it('passes conceptId=general to widget', () => {
    renderPage();
    expect(screen.getByTestId('cohort-insights-widget')).toHaveAttribute('data-concept-id', 'general');
  });

  it('passes courseId=all to widget', () => {
    renderPage();
    expect(screen.getByTestId('cohort-insights-widget')).toHaveAttribute('data-course-id', 'all');
  });

  it('title is inside an h1 element', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Cohort Insights');
  });

  it('subtitle is a paragraph element', () => {
    renderPage();
    const subtitle = screen.getByText('Discover how past cohorts approached the same concepts');
    expect(subtitle.tagName).toBe('P');
  });

  it('does not display raw i18n keys', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('cohortInsights.title');
    expect(body).not.toContain('cohortInsights.subtitle');
  });

  it('does not display raw technical error strings', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/\[object/);
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('null');
  });

  it('renders within a max-w-4xl container', () => {
    renderPage();
    const widget = screen.getByTestId('cohort-insights-widget');
    const container = widget.closest('.max-w-4xl');
    expect(container).toBeTruthy();
  });

  it('contains padding classes for proper spacing', () => {
    renderPage();
    const widget = screen.getByTestId('cohort-insights-widget');
    const container = widget.closest('.container');
    expect(container).toBeTruthy();
  });

  it('renders exactly one widget instance', () => {
    renderPage();
    expect(screen.getAllByTestId('cohort-insights-widget')).toHaveLength(1);
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <CohortInsightsPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('cohort-insights-widget')).toBeInTheDocument();
  });

  it('heading has correct styling classes', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toContain('text-3xl');
    expect(heading.className).toContain('font-bold');
  });

  it('subtitle has muted foreground styling', () => {
    renderPage();
    const subtitle = screen.getByText('Discover how past cohorts approached the same concepts');
    expect(subtitle.className).toContain('text-muted-foreground');
  });

  it('header section has bottom margin', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.parentElement?.className).toContain('mb-6');
  });

  it('renders with proper document structure', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-testid="layout"]')).toBeTruthy();
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('p')).toBeTruthy();
  });
});

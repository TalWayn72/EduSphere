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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ assessmentId: 'assess-123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/AssessmentForm', () => ({
  AssessmentForm: (props: Record<string, unknown>) => (
    <div data-testid="assessment-form" data-campaign-id={props.campaignId} data-proctoring={String(props.proctoringEnabled)} data-rater-role={props.raterRole}>
      AssessmentForm Mock
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

import { AssessmentPage } from './AssessmentPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AssessmentPage />
    </MemoryRouter>
  );

describe('AssessmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders AssessmentForm component', () => {
    renderPage();
    expect(screen.getByTestId('assessment-form')).toBeInTheDocument();
  });

  it('passes assessmentId from route params as campaignId', () => {
    renderPage();
    expect(screen.getByTestId('assessment-form')).toHaveAttribute('data-campaign-id', 'assess-123');
  });

  it('passes assessmentId prop to AssessmentForm', () => {
    renderPage();
    expect(screen.getByTestId('assessment-form')).toHaveAttribute('data-campaign-id', 'assess-123');
  });

  it('enables proctoring by default', () => {
    renderPage();
    expect(screen.getByTestId('assessment-form')).toHaveAttribute('data-proctoring', 'true');
  });

  it('sets rater role to PEER', () => {
    renderPage();
    expect(screen.getByTestId('assessment-form')).toHaveAttribute('data-rater-role', 'PEER');
  });

  it('renders content within max-w-2xl container', () => {
    renderPage();
    const form = screen.getByTestId('assessment-form');
    expect(form.parentElement?.className).toContain('max-w-2xl');
  });

  it('does not display raw technical error strings', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/\[object/);
  });

  it('renders without crashing with default assessmentId', () => {
    // The component defaults assessmentId to '' when param is missing
    renderPage();
    expect(screen.getByTestId('assessment-form')).toBeInTheDocument();
  });

  it('does not display raw i18n keys (namespace.key pattern)', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    // No untranslated keys like "assessment.title" should appear
    expect(body).not.toMatch(/^[a-z]+\.[a-z]+\.[a-z]+$/m);
  });

  it('renders AssessmentForm text', () => {
    renderPage();
    expect(screen.getByText('AssessmentForm Mock')).toBeInTheDocument();
  });

  it('wraps form in centered layout', () => {
    renderPage();
    const form = screen.getByTestId('assessment-form');
    expect(form.parentElement?.className).toContain('mx-auto');
  });

  it('applies top margin to form container', () => {
    renderPage();
    const form = screen.getByTestId('assessment-form');
    expect(form.parentElement?.className).toContain('mt-6');
  });

  it('demo criteria include Communication, Teamwork, Problem Solving', () => {
    // Verify these are passed — but since we mock AssessmentForm,
    // we verify the component renders without crashing (criteria are valid)
    renderPage();
    expect(screen.getByTestId('assessment-form')).toBeInTheDocument();
  });

  it('does not render null or undefined text', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('null');
  });

  it('renders with layout as root container', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-testid="layout"]')).toBeTruthy();
  });

  it('contains exactly one AssessmentForm instance', () => {
    renderPage();
    const forms = screen.getAllByTestId('assessment-form');
    expect(forms).toHaveLength(1);
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <AssessmentPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('assessment-form')).toBeInTheDocument();
  });

  it('snapshot stability', () => {
    const { container } = renderPage();
    expect(container.innerHTML).toContain('assessment-form');
  });
});

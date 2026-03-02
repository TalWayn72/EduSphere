import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/compliance.queries', () => ({
  COMPLIANCE_COURSES_QUERY: 'COMPLIANCE_COURSES_QUERY',
  GENERATE_COMPLIANCE_REPORT_MUTATION: 'GENERATE_COMPLIANCE_REPORT_MUTATION',
  UPDATE_COURSE_COMPLIANCE_MUTATION: 'UPDATE_COURSE_COMPLIANCE_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ComplianceReportsPage } from './ComplianceReportsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'GDPR Essentials',
    slug: 'gdpr-essentials',
    isCompliance: true,
    complianceDueDate: '2026-06-30',
    isPublished: true,
    estimatedHours: 2,
  },
  {
    id: 'course-2',
    title: 'Data Security 101',
    slug: 'data-security-101',
    isCompliance: false,
    complianceDueDate: null,
    isPublished: true,
    estimatedHours: 1,
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  courses: typeof MOCK_COURSES | [] = [],
  fetching = false,
  error?: { message: string }
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { complianceCourses: courses },
      fetching,
      error: error ?? undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ComplianceReportsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql([]);
  });

  it('renders "Compliance Training Reports" heading', () => {
    renderPage();
    expect(screen.getByText('Compliance Training Reports')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('allows ORG_ADMIN to view the page', () => {
    renderPage();
    expect(screen.getByText('Compliance Training Reports')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Compliance Training Reports')).toBeInTheDocument();
  });

  it('renders "Compliance Courses" card header', () => {
    renderPage();
    expect(screen.getByText('Compliance Courses')).toBeInTheDocument();
  });

  it('renders "Generate Report" card header', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Generate Report' })
    ).toBeInTheDocument();
  });

  it('shows "No compliance courses configured yet." when list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(
      screen.getByText('No compliance courses configured yet.')
    ).toBeInTheDocument();
  });

  it('shows loading indicator while fetching', () => {
    setupUrql([], true);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders course titles when courses exist', () => {
    setupUrql(MOCK_COURSES);
    renderPage();
    expect(
      screen.getAllByText('GDPR Essentials').length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Data Security 101').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('shows "Remove" button for compliance courses and "Add to Compliance" for non-compliance', () => {
    setupUrql(MOCK_COURSES);
    renderPage();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add to compliance/i })
    ).toBeInTheDocument();
  });

  it('renders "Generate Report" button initially disabled when no courses selected', () => {
    setupUrql(MOCK_COURSES);
    renderPage();
    expect(
      screen.getByRole('button', { name: /generate report/i })
    ).toBeDisabled();
  });

  it('enables "Generate Report" button after selecting a course', () => {
    setupUrql(MOCK_COURSES);
    renderPage();
    // Check the checkbox for course-1 in the Generate Report section
    const [firstCheckbox] = screen.getAllByRole('checkbox');
    fireEvent.click(firstCheckbox!);
    expect(
      screen.getByRole('button', { name: /generate report/i })
    ).not.toBeDisabled();
  });

  it('renders "As of date" label for optional date filter', () => {
    renderPage();
    expect(screen.getByLabelText(/as of date/i)).toBeInTheDocument();
  });

  it('shows error message when query returns error', () => {
    setupUrql([], false, { message: 'Network error' });
    renderPage();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});

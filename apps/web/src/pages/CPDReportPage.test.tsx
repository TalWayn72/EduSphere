import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as urql from 'urql';
import { CPDReportPage } from './CPDReportPage';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/cpd.queries', () => ({
  MY_CPD_REPORT_QUERY: 'MY_CPD_REPORT_QUERY',
  EXPORT_CPD_REPORT_MUTATION: 'EXPORT_CPD_REPORT_MUTATION',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockExportReport = vi.fn();

const MOCK_REPORT = {
  totalHours: 24.5,
  byType: [
    { name: 'CLE', regulatoryBody: 'State Bar', totalHours: 12.0 },
    { name: 'CPE', regulatoryBody: 'NASBA', totalHours: 12.5 },
  ],
  entries: [
    {
      id: 'e1',
      courseId: 'c1',
      creditTypeName: 'CLE',
      earnedHours: 2.0,
      completionDate: '2026-01-15T10:00:00Z',
    },
    {
      id: 'e2',
      courseId: 'c2',
      creditTypeName: 'CPE',
      earnedHours: 4.0,
      completionDate: '2026-02-10T14:00:00Z',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    {} as never,
    mockExportReport as never,
  ]);
  mockExportReport.mockResolvedValue({ data: { exportCpdReport: '/report.pdf' } });
});

describe('CPDReportPage', () => {
  it('renders the "My CPD Report" heading', () => {
    render(<CPDReportPage />);
    expect(
      screen.getByRole('heading', { name: /my cpd report/i })
    ).toBeInTheDocument();
  });

  it('shows loading indicator when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getByText(/loading report/i)).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' },
      },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getByText(/failed to load cpd report/i)).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('shows total CPD hours when report is loaded', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getByText('24.5')).toBeInTheDocument();
  });

  it('renders byType breakdown cards', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    // CardTitle renders as h3; type names also appear in table cells
    expect(screen.getByText('CLE', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('CPE', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('State Bar')).toBeInTheDocument();
    // "12.0 hrs" only appears in byType cards
    expect(screen.getByText('12.0 hrs')).toBeInTheDocument();
  });

  it('renders NASBA, AMA, CSV export buttons', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getByRole('button', { name: /nasba/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ama/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });

  it('calls exportReport with correct format when NASBA is clicked', async () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    fireEvent.click(screen.getByRole('button', { name: /nasba/i }));
    await vi.waitFor(() =>
      expect(mockExportReport).toHaveBeenCalledWith({ format: 'NASBA' })
    );
  });

  it('shows "No CPD credits earned yet" when entries is empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { myCpdReport: { ...MOCK_REPORT, entries: [] } },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(
      screen.getByText(/no cpd credits earned yet/i)
    ).toBeInTheDocument();
  });

  it('renders history table rows for each entry', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 entries
  });

  it('shows completion date without time component', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCpdReport: MOCK_REPORT }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<CPDReportPage />);
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
  });
});

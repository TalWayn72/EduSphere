import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResponse } from 'urql';

// ─── Module mocks (hoisted before component imports) ──────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
    vi.fn(),
  ]),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { CertificatesPage } from './CertificatesPage';
import { useQuery } from 'urql';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_CERTS = [
  {
    id: 'cert-1',
    courseId: 'course-abc',
    issuedAt: '2024-03-15T00:00:00Z',
    verificationCode: 'VERIFY-ABC-001',
    pdfUrl: '/certificates/internal/cert-1.pdf',
    metadata: { courseName: 'Introduction to GraphQL' },
  },
  {
    id: 'cert-2',
    courseId: 'course-xyz',
    issuedAt: '2024-06-01T00:00:00Z',
    verificationCode: 'VERIFY-XYZ-002',
    pdfUrl: '/certificates/internal/cert-2.pdf',
    metadata: { courseName: 'Advanced TypeScript' },
  },
];

const NOOP_STATE: UseQueryResponse = [
  {
    data: undefined,
    fetching: false,
    error: undefined,
    stale: false,
    operation: undefined as unknown as UseQueryResponse[0]['operation'],
  },
  vi.fn(),
  vi.fn(),
] as unknown as UseQueryResponse;

function makeState(overrides: {
  data?: unknown;
  fetching?: boolean;
  error?: { message: string } | undefined;
}): UseQueryResponse {
  return [
    {
      data: overrides.data,
      fetching: overrides.fetching ?? false,
      error: overrides.error as UseQueryResponse[0]['error'],
      stale: false,
      operation: undefined as unknown as UseQueryResponse[0]['operation'],
    },
    vi.fn(),
    vi.fn(),
  ] as unknown as UseQueryResponse;
}

/**
 * Mock useQuery to return certsState for MyCertificates and downloadState
 * for CertificateDownloadUrl queries, matched by document string content.
 */
function mockQueries(
  certsOverrides: Parameters<typeof makeState>[0],
  downloadOverrides: Parameters<typeof makeState>[0] = {}
) {
  vi.mocked(useQuery).mockImplementation((opts) => {
    const doc = String(opts.query);
    if (doc.includes('MyCertificates')) return makeState(certsOverrides);
    if (doc.includes('CertificateDownloadUrl')) return makeState(downloadOverrides);
    return NOOP_STATE;
  });
}

async function renderPage() {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>
    );
  });
  return result!;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CertificatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueries({});
  });

  // ── 1. Heading ───────────────────────────────────────────────────────────

  it('renders "Certificates" heading', async () => {
    await renderPage();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('Certificates');
  });

  // ── 2. Skeleton ──────────────────────────────────────────────────────────

  it('shows skeleton cards when fetching is true', async () => {
    mockQueries({ fetching: true });
    await renderPage();
    const skeletons = document.querySelectorAll('[data-testid="cert-skeleton"]');
    expect(skeletons.length).toBe(3);
  });

  it('does not show certificate cards while fetching', async () => {
    mockQueries({ fetching: true });
    await renderPage();
    expect(screen.queryByTestId('certificate-card')).not.toBeInTheDocument();
  });

  // ── 3. Empty state ───────────────────────────────────────────────────────

  it('shows empty state when certificates array is empty', async () => {
    mockQueries({ data: { myCertificates: [] } });
    await renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText(/No certificates yet — complete a course to earn one!/i)
    ).toBeInTheDocument();
  });

  // ── 4. Certificate card with course name ─────────────────────────────────

  it('renders certificate cards with course names from metadata', async () => {
    mockQueries({ data: { myCertificates: MOCK_CERTS } });
    await renderPage();
    expect(screen.getByText('Introduction to GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
  });

  it('falls back to "Course Certificate" when metadata.courseName missing', async () => {
    const certNoName = [{ ...MOCK_CERTS[0]!, metadata: null }];
    mockQueries({ data: { myCertificates: certNoName } });
    await renderPage();
    expect(screen.getByText('Course Certificate')).toBeInTheDocument();
  });

  // ── 5. Verification code ─────────────────────────────────────────────────

  it('shows verification code in each certificate card', async () => {
    mockQueries({ data: { myCertificates: MOCK_CERTS } });
    await renderPage();
    const codes = screen.getAllByTestId('verification-code');
    expect(codes.length).toBe(2);
    expect(codes[0]).toHaveTextContent('VERIFY-ABC-001');
    expect(codes[1]).toHaveTextContent('VERIFY-XYZ-002');
  });

  // ── 6. Download button present and clickable ─────────────────────────────

  it('renders Download PDF button for each certificate', async () => {
    mockQueries({ data: { myCertificates: MOCK_CERTS } });
    await renderPage();
    const buttons = screen.getAllByTestId('download-btn');
    expect(buttons.length).toBe(2);
  });

  it('Download PDF button is clickable without throwing', async () => {
    mockQueries({ data: { myCertificates: [MOCK_CERTS[0]] } });
    await renderPage();
    const btn = screen.getByTestId('download-btn');
    expect(() => btn.click()).not.toThrow();
  });

  // ── 7. Regression: raw pdfUrl must NOT appear in the DOM ─────────────────

  it('does NOT expose raw pdfUrl paths in DOM text', async () => {
    mockQueries({ data: { myCertificates: MOCK_CERTS } });
    await renderPage();
    expect(document.body.textContent).not.toContain(
      '/certificates/internal/cert-1.pdf'
    );
    expect(document.body.textContent).not.toContain(
      '/certificates/internal/cert-2.pdf'
    );
  });

  it('does NOT render pdfUrl in any DOM href attribute', async () => {
    mockQueries({ data: { myCertificates: MOCK_CERTS } });
    await renderPage();
    const allAnchors = document.querySelectorAll('a[href]');
    allAnchors.forEach((el) => {
      expect(el.getAttribute('href')).not.toContain('/certificates/internal/');
    });
  });

  // ── 8. Error state ────────────────────────────────────────────────────────

  it('renders error card when query fails', async () => {
    mockQueries({ error: { message: 'Network error' } });
    await renderPage();
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });
});

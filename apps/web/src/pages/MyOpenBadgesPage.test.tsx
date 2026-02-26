import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResponse } from 'urql';

// ─── Module mocks (hoisted before component imports) ──────────────────────────

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ]),
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { MyOpenBadgesPage } from './MyOpenBadgesPage';
import { useQuery } from 'urql';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BADGES = [
  {
    id: 'b1',
    issuedAt: '2024-01-01T00:00:00Z',
    expiresAt: null,
    revoked: false,
    revokedAt: null,
    revokedReason: null,
    evidenceUrl: null,
    vcDocument: '{"@context":["https://www.w3.org/2018/credentials/v1"]}',
    definition: {
      id: 'def1',
      name: 'Excellence Badge',
      description: 'For excellence',
      imageUrl: null,
      criteriaUrl: null,
      tags: [],
      issuerId: 'issuer1',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'b2',
    issuedAt: '2024-02-01T00:00:00Z',
    expiresAt: null,
    revoked: true,
    revokedAt: '2024-03-01T00:00:00Z',
    revokedReason: 'Policy violation',
    evidenceUrl: null,
    vcDocument: '{"@context":["https://www.w3.org/2018/credentials/v1"]}',
    definition: {
      id: 'def2',
      name: 'Participation Badge',
      description: 'For participation',
      imageUrl: null,
      criteriaUrl: null,
      tags: [],
      issuerId: 'issuer1',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <MyOpenBadgesPage />
    </MemoryRouter>
  );
}

function mockQuery(overrides: {
  data?: unknown;
  fetching?: boolean;
  error?: { message: string } | undefined;
}) {
  vi.mocked(useQuery).mockReturnValue([
    {
      data: overrides.data,
      fetching: overrides.fetching ?? false,
      error: overrides.error as UseQueryResponse[0]['error'],
      stale: false,
      operation: undefined as unknown as UseQueryResponse[0]['operation'],
    },
    vi.fn(),
    vi.fn(),
  ] as unknown as UseQueryResponse);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MyOpenBadgesPage', () => {
  beforeEach(() => {
    // Default: no data, not fetching, no error
    mockQuery({ data: undefined, fetching: false, error: undefined });
  });

  // ── Page heading ─────────────────────────────────────────────────────────

  it('renders the page title "My Open Badges"', () => {
    renderPage();
    expect(screen.getByText('My Open Badges')).toBeInTheDocument();
  });

  it('renders inside the Layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('renders 3 skeleton cards while fetching', () => {
    mockQuery({ fetching: true });
    renderPage();
    // BadgeSkeleton cards render with animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('does not render empty state while fetching', () => {
    mockQuery({ fetching: true });
    renderPage();
    expect(screen.queryByText(/haven't earned any Open Badges/)).not.toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  it('renders empty state when badges array is empty', () => {
    mockQuery({ data: { myOpenBadges: [] } });
    renderPage();
    expect(
      screen.getByText(/haven't earned any Open Badges/i)
    ).toBeInTheDocument();
  });

  it('renders the helper text for empty state', () => {
    mockQuery({ data: { myOpenBadges: [] } });
    renderPage();
    expect(
      screen.getByText(/Complete courses and activities/i)
    ).toBeInTheDocument();
  });

  it('renders empty state when data is undefined and not fetching', () => {
    mockQuery({ data: undefined, fetching: false });
    renderPage();
    expect(
      screen.getByText(/haven't earned any Open Badges/i)
    ).toBeInTheDocument();
  });

  // ── Badge cards ───────────────────────────────────────────────────────────

  it('renders badge cards when data has badges', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    expect(screen.getByText('Excellence Badge')).toBeInTheDocument();
    expect(screen.getByText('Participation Badge')).toBeInTheDocument();
  });

  it('renders badge description text', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    expect(screen.getByText('For excellence')).toBeInTheDocument();
    expect(screen.getByText('For participation')).toBeInTheDocument();
  });

  it('renders the issued date for each badge', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    // Both badges show "Issued: ..."
    const issuedLabels = screen.getAllByText(/^Issued:/);
    expect(issuedLabels.length).toBe(2);
  });

  // ── Status indicators ─────────────────────────────────────────────────────

  it('shows green "Valid" status for non-revoked badge', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows red "Revoked" status for revoked badge', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('shows revokedReason in revoked badge', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    expect(screen.getByText(/Policy violation/i)).toBeInTheDocument();
  });

  it('does not show revoke info for valid badge', () => {
    const onlyValid = [MOCK_BADGES[0]];
    mockQuery({ data: { myOpenBadges: onlyValid } });
    renderPage();
    expect(screen.queryByText(/Policy violation/i)).not.toBeInTheDocument();
  });

  // ── Download VC button ────────────────────────────────────────────────────

  it('renders "Download VC" button for each badge', () => {
    mockQuery({ data: { myOpenBadges: MOCK_BADGES } });
    renderPage();
    const downloadButtons = screen.getAllByRole('button', { name: /Download VC/i });
    expect(downloadButtons.length).toBe(2);
  });

  it('triggers file download when "Download VC" is clicked', () => {
    mockQuery({ data: { myOpenBadges: [MOCK_BADGES[0]] } });
    renderPage();

    // Stub URL APIs
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    // Stub createElement to intercept anchor click
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = origCreateElement('a');
        anchor.click = clickSpy;
        return anchor;
      }
      return origCreateElement(tag);
    });

    const downloadBtn = screen.getByRole('button', { name: /Download VC/i });
    fireEvent.click(downloadBtn);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    vi.restoreAllMocks();
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('renders error message when query returns an error', () => {
    mockQuery({ error: { message: 'Network error' } });
    renderPage();
    expect(screen.getByText(/Failed to load badges: Network error/i)).toBeInTheDocument();
  });

  it('does not render badge cards when error is set', () => {
    mockQuery({ error: { message: 'Unauthorized' }, data: undefined });
    renderPage();
    expect(screen.queryByText('Excellence Badge')).not.toBeInTheDocument();
  });

  // ── Badge with image ──────────────────────────────────────────────────────

  it('renders badge image when imageUrl is provided', () => {
    const badgeWithImage = [
      {
        ...MOCK_BADGES[0],
        definition: { ...MOCK_BADGES[0].definition, imageUrl: 'https://example.com/badge.png' },
      },
    ];
    mockQuery({ data: { myOpenBadges: badgeWithImage } });
    renderPage();
    const img = screen.getByRole('img', { name: 'Excellence Badge' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/badge.png');
  });

  it('renders fallback Award icon when imageUrl is null', () => {
    mockQuery({ data: { myOpenBadges: [MOCK_BADGES[0]] } });
    renderPage();
    // When no image URL, Award icon container is rendered (no img element)
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

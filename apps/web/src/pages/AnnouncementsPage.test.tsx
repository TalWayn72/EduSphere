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

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/announcements.queries', () => ({
  ADMIN_ANNOUNCEMENTS_QUERY: 'ADMIN_ANNOUNCEMENTS_QUERY',
  CREATE_ANNOUNCEMENT_MUTATION: 'CREATE_ANNOUNCEMENT_MUTATION',
  UPDATE_ANNOUNCEMENT_MUTATION: 'UPDATE_ANNOUNCEMENT_MUTATION',
  DELETE_ANNOUNCEMENT_MUTATION: 'DELETE_ANNOUNCEMENT_MUTATION',
  PUBLISH_ANNOUNCEMENT_MUTATION: 'PUBLISH_ANNOUNCEMENT_MUTATION',
}));

vi.mock('./AnnouncementsPage.form', () => ({
  AnnouncementForm: vi.fn(() => <div data-testid="announcement-form" />),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { AnnouncementsPage } from './AnnouncementsPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'System Maintenance',
    body: 'Scheduled downtime on Saturday.',
    priority: 'WARNING',
    targetAudience: 'ALL',
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'ann-2',
    title: 'New Course Launch',
    body: 'Exciting new courses available.',
    priority: 'INFO',
    targetAudience: 'STUDENTS',
    isActive: false,
    createdAt: '2024-03-02T00:00:00Z',
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  announcements: typeof MOCK_ANNOUNCEMENTS | [] = [],
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { adminAnnouncements: { announcements } },
      fetching,
      error: undefined,
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
      <AnnouncementsPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnouncementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Announcements" heading via AdminLayout', () => {
    renderPage();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
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
    expect(screen.getByText('Announcements')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
  });

  it('shows "No announcements yet." when list is empty', () => {
    setupUrql([]);
    renderPage();
    expect(screen.getByText('No announcements yet.')).toBeInTheDocument();
  });

  it('shows loading text when fetching', () => {
    setupUrql([], true);
    renderPage();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders "Create Announcement" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /create announcement/i })
    ).toBeInTheDocument();
  });

  it('shows AnnouncementForm when "Create Announcement" is clicked', () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: /create announcement/i })
    );
    expect(screen.getByTestId('announcement-form')).toBeInTheDocument();
  });

  it('toggles to "Cancel" button after opening form', () => {
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: /create announcement/i })
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders announcement titles when data is loaded', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(screen.getByText('System Maintenance')).toBeInTheDocument();
    expect(screen.getByText('New Course Launch')).toBeInTheDocument();
  });

  it('shows "Active" badge for active announcements', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Draft" badge for inactive announcements', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders the priority label on each announcement', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(screen.getByText('WARNING')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  it('renders "Unpublish" button for active announcements', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(
      screen.getByRole('button', { name: /unpublish/i })
    ).toBeInTheDocument();
  });

  it('renders "Publish" button for inactive (draft) announcements', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    expect(
      screen.getByRole('button', { name: /^publish$/i })
    ).toBeInTheDocument();
  });

  it('renders "Delete" buttons for each announcement', () => {
    setupUrql(MOCK_ANNOUNCEMENTS);
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(MOCK_ANNOUNCEMENTS.length);
  });
});

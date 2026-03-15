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
    useParams: () => ({ id: 'disc-123' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/social/MessageItem', () => ({
  default: (props: Record<string, unknown>) => {
    const msg = props.message as { id: string; content: string };
    return <div data-testid={`message-item-${msg.id}`}>{msg.content}</div>;
  },
}));

vi.mock('@/components/social/MessageComposer', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="message-composer" data-discussion-id={props.discussionId} />
  ),
}));

vi.mock('@/lib/graphql/discussion.queries', () => ({
  DISCUSSION_MESSAGES_QUERY: 'query DiscussionMessages {}',
  MESSAGE_ADDED_SUBSCRIPTION: 'subscription MessageAdded {}',
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

import * as urql from 'urql';
import { DiscussionDetailPage } from './DiscussionDetailPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <DiscussionDetailPage />
    </MemoryRouter>
  );

const MOCK_MESSAGES = [
  { id: 'm-1', userId: 'u-1', content: 'Hello there!', messageType: 'TEXT', parentMessageId: null, likesCount: 3, isLikedByMe: false, createdAt: '2026-03-01T10:00:00Z' },
  { id: 'm-2', userId: 'u-2', content: 'Great point!', messageType: 'TEXT', parentMessageId: 'm-1', likesCount: 1, isLikedByMe: true, createdAt: '2026-03-01T10:05:00Z' },
];

describe('DiscussionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders Back to Discussions link', () => {
    renderPage();
    expect(screen.getByText('Back to Discussions')).toBeInTheDocument();
  });

  it('back link points to /discussions', () => {
    renderPage();
    const backLink = screen.getByText('Back to Discussions').closest('a');
    expect(backLink).toHaveAttribute('href', '/discussions');
  });

  it('renders message log region with aria-label', () => {
    renderPage();
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByLabelText('Discussion messages')).toBeInTheDocument();
  });

  it('renders MessageComposer with discussion id', () => {
    renderPage();
    const composer = screen.getByTestId('message-composer');
    expect(composer).toBeInTheDocument();
    expect(composer).toHaveAttribute('data-discussion-id', 'disc-123');
  });

  // --- Loading state ---
  it('shows loading message when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });

  // --- Empty state ---
  it('shows empty state when no messages', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: [] }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it('shows encouragement text in empty state', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: [] }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText(/Be the first to say something/)).toBeInTheDocument();
  });

  // --- Data loaded ---
  it('renders messages when data is available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: MOCK_MESSAGES }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('message-item-m-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-item-m-2')).toBeInTheDocument();
  });

  it('renders message content text', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: MOCK_MESSAGES }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('Great point!')).toBeInTheDocument();
  });

  it('does not show loading indicator when data is loaded', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: MOCK_MESSAGES }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
  });

  it('does not show empty state when messages exist', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { discussionMessages: MOCK_MESSAGES }, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.queryByText(/No messages yet/)).not.toBeInTheDocument();
  });

  // --- Error state ---
  it('does not crash on query error', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: new Error('Network error'), stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows empty state on error (no messages)', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: new Error('Network error'), stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it('does not display raw error messages to user', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: { message: 'Cannot query field' } as Error, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('Cannot query field');
  });

  // --- Accessibility ---
  it('log region has aria-live=polite', () => {
    renderPage();
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('does not display raw i18n keys', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('discussion.messages');
  });

  it('does not render null or undefined text', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\bundefined\b/);
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <DiscussionDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });
});

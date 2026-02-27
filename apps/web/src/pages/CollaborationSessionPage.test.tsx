import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CollaborationSessionPage } from './CollaborationSessionPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

// Stable mock for the JOIN_DISCUSSION_MUTATION execute function so that
// we can assert it was called with the correct discussionId argument.
const mockJoinFn = vi.fn();

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [
    { fetching: false, error: undefined },
    mockJoinFn,
  ]),
  useSubscription: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({
    id: 'u1',
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'STUDENT',
    tenantId: 't1',
  }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/CollaborativeEditor', () => ({
  CollaborativeEditor: ({
    content,
    onChange,
  }: {
    content: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="editor" onClick={() => onChange('<p>updated</p>')}>
      {content}
    </div>
  ),
}));

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/collab/session', search }]}>
      <Routes>
        <Route path="/collab/session" element={<CollaborationSessionPage />} />
        <Route path="/collab" element={<div>Collab Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CollaborationSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the document title input', () => {
    renderPage('?partner=Bob&topic=Talmud');
    expect(screen.getByDisplayValue(/Chavruta: Talmud/)).toBeInTheDocument();
  });

  it('shows default title when no topic param', () => {
    renderPage('?partner=Bob');
    expect(screen.getByDisplayValue('Shared Study Notes')).toBeInTheDocument();
  });

  it('shows partner name in the heading', () => {
    renderPage('?partner=Rabbi+Cohen&topic=Maimonides');
    // partner name appears in the session info bar (and possibly in infoNote)
    const matches = screen.getAllByText(/Rabbi Cohen/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the collaborative editor', () => {
    renderPage();
    expect(screen.getByTestId('editor')).toBeInTheDocument();
  });

  it('renders participant count', () => {
    renderPage('?partner=Sarah');
    // Component shows participantCount (defaults to 1) participants
    expect(screen.getByText(/participants/i)).toBeInTheDocument();
  });

  it('renders participant count indicator', () => {
    renderPage();
    expect(screen.getByText(/participants/i)).toBeInTheDocument();
  });

  it('updates document title when input changes', () => {
    renderPage('?partner=Bob');
    const input = screen.getByDisplayValue(
      'Shared Study Notes'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Notes' } });
    expect(input.value).toBe('My Notes');
  });

  it('shows Save button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows saved confirmation after clicking Save', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('navigates to /collaboration when Sessions button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /sessions/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/collaboration');
  });

  it('renders the Chavruta session info bar', () => {
    renderPage('?partner=Alice');
    expect(screen.getByText(/Chavruta with/i)).toBeInTheDocument();
  });

  // ── Auto-join mutation (line ~59 — useEffect with discussionId guard) ────────

  it('calls JOIN_DISCUSSION_MUTATION on mount when discussionId is present', () => {
    renderPage('?discussionId=disc-abc-123&partner=Bob');
    // useEffect fires synchronously after mount in jsdom
    expect(mockJoinFn).toHaveBeenCalledTimes(1);
    expect(mockJoinFn).toHaveBeenCalledWith({ discussionId: 'disc-abc-123' });
  });

  it('does NOT call JOIN_DISCUSSION_MUTATION when discussionId is absent', () => {
    renderPage('?partner=Bob&topic=Talmud');
    // No discussionId → useEffect guard (if discussionId) prevents the call
    expect(mockJoinFn).not.toHaveBeenCalled();
  });

  it('auto-join fires without any user interaction', () => {
    renderPage('?discussionId=disc-xyz&partner=Alice');
    // Mutation called purely from mount-time useEffect — no click needed
    expect(mockJoinFn).toHaveBeenCalledWith({ discussionId: 'disc-xyz' });
  });

  it('shows CRDT sync active note with truncated discussionId', () => {
    renderPage('?discussionId=disc-abc-123');
    // Footer text contains the first 8 chars of discussionId
    expect(screen.getByText(/disc-abc/i)).toBeInTheDocument();
  });

  it('shows CRDT sync inactive note when no discussionId', () => {
    renderPage('?partner=Bob');
    // collaboration.json: crdtSyncInactive = "Sync inactive"
    expect(screen.getByText('Sync inactive')).toBeInTheDocument();
  });
});

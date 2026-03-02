import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/profile.queries', () => ({
  UPDATE_PROFILE_VISIBILITY_MUTATION: 'UPDATE_PROFILE_VISIBILITY_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ProfileVisibilityCard } from './ProfileVisibilityCard';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRIVATE_PREFS = {
  locale: 'en',
  theme: 'light',
  emailNotifications: true,
  pushNotifications: true,
  isPublicProfile: false,
};

const PUBLIC_PREFS = { ...PRIVATE_PREFS, isPublicProfile: true };

const NOOP_EXECUTE = vi.fn();
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

function renderCard(
  prefs: typeof PRIVATE_PREFS | null = PRIVATE_PREFS,
  userId = 'user-1'
) {
  return render(
    <MemoryRouter>
      <ProfileVisibilityCard userId={userId} preferences={prefs} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileVisibilityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NOOP_EXECUTE.mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('shows private label when isPublicProfile is false', () => {
    renderCard(PRIVATE_PREFS);
    expect(screen.getByText('Your profile is private')).toBeInTheDocument();
  });

  it('shows public label when isPublicProfile is true', () => {
    renderCard(PUBLIC_PREFS);
    expect(screen.getByText('Your profile is public')).toBeInTheDocument();
  });

  it('renders the toggle switch', () => {
    renderCard();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggle switch has aria-checked="false" when private', () => {
    renderCard(PRIVATE_PREFS);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggle switch has aria-checked="true" when public', () => {
    renderCard(PUBLIC_PREFS);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows "View public profile" link when public', () => {
    renderCard(PUBLIC_PREFS);
    expect(screen.getByText('View public profile')).toBeInTheDocument();
  });

  it('does not show "View public profile" link when private', () => {
    renderCard(PRIVATE_PREFS);
    expect(screen.queryByText('View public profile')).not.toBeInTheDocument();
  });

  it('shows "Copy link" button when public', () => {
    renderCard(PUBLIC_PREFS);
    expect(
      screen.getByRole('button', { name: /copy link/i })
    ).toBeInTheDocument();
  });

  it('does not show "Copy link" button when private', () => {
    renderCard(PRIVATE_PREFS);
    expect(
      screen.queryByRole('button', { name: /copy link/i })
    ).not.toBeInTheDocument();
  });

  it('calls mutation with isPublic=true when toggling from private', async () => {
    const mockExecute = vi
      .fn()
      .mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);

    renderCard(PRIVATE_PREFS);
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ isPublic: true });
    });
  });

  it('calls mutation with isPublic=false when toggling from public', async () => {
    const mockExecute = vi
      .fn()
      .mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockExecute,
    ] as never);

    renderCard(PUBLIC_PREFS);
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({ isPublic: false });
    });
  });

  it('handles null preferences gracefully (defaults to private)', () => {
    renderCard(null);
    expect(screen.getByText('Your profile is private')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });
});

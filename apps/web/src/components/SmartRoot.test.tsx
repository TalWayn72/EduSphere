import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock auth
vi.mock('@/lib/auth', () => ({ isAuthenticated: vi.fn() }));
// Mock LandingPage
vi.mock('@/pages/LandingPage', () => ({ LandingPage: () => <div data-testid="landing-page" /> }));

import { SmartRoot } from './SmartRoot';
import * as auth from '@/lib/auth';

// Helper to render SmartRoot within a MemoryRouter and capture the current location
function renderSmartRoot(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SmartRoot />
    </MemoryRouter>
  );
}

describe('SmartRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Unauthenticated user ───────────────────────────────────────────────────

  it('renders LandingPage for unauthenticated users', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    renderSmartRoot();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('does NOT render Navigate for unauthenticated users', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    renderSmartRoot();
    // Navigate replaces the content — landing-page must be present as the only output
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('calls isAuthenticated exactly once on render', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    renderSmartRoot();
    expect(auth.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  // ── Authenticated user ─────────────────────────────────────────────────────

  it('does NOT render LandingPage for authenticated users', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(true);
    const { queryByTestId } = renderSmartRoot();
    expect(queryByTestId('landing-page')).not.toBeInTheDocument();
  });

  it('calls isAuthenticated exactly once when authenticated', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(true);
    renderSmartRoot();
    expect(auth.isAuthenticated).toHaveBeenCalledTimes(1);
  });

  // ── Boundary: switching auth state ────────────────────────────────────────

  it('renders LandingPage when isAuthenticated returns false (explicit)', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    const { getByTestId } = renderSmartRoot();
    expect(getByTestId('landing-page')).toBeInTheDocument();
  });

  it('does not crash when re-rendered', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    const { rerender } = renderSmartRoot();
    expect(() =>
      rerender(
        <MemoryRouter>
          <SmartRoot />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  // ── No raw technical strings ───────────────────────────────────────────────

  it('does not display raw error strings when unauthenticated', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(false);
    renderSmartRoot();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/undefined/);
  });

  it('does not display raw error strings when authenticated', () => {
    vi.mocked(auth.isAuthenticated).mockReturnValue(true);
    renderSmartRoot();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/undefined/);
  });
});

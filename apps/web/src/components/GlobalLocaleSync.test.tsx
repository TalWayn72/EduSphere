/**
 * GlobalLocaleSync unit tests — BUG-045 + BUG-091 regression.
 *
 * Verifies that the DB locale is applied globally on every page (not only
 * on SettingsPage), that localStorage takes precedence once set, and that
 * fresh logins force a re-sync from DB (BUG-091).
 *
 * NOTE: react-i18next is globally mocked via setup.ts (vi.mock, hoisted).
 * We cannot intercept i18n.changeLanguage directly because each call to
 * useTranslation() creates a fresh vi.fn() — instead we verify the
 * observable side effects: localStorage and applyDocumentDirection.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as urql from 'urql';
import { LOCALE_SYNCED_KEY } from '@/lib/auth';

// ── urql mock ─────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

vi.mock('@/lib/queries', () => ({
  ME_QUERY: 'ME_QUERY',
}));

vi.mock('@/lib/i18n', () => ({
  applyDocumentDirection: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────
import { GlobalLocaleSync } from './GlobalLocaleSync';
import { applyDocumentDirection } from '@/lib/i18n';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeUrqlResult(locale: string | null) {
  return [
    {
      data:
        locale !== null
          ? { me: { id: 'u-1', preferences: { locale } } }
          : undefined,
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GlobalLocaleSync — BUG-045', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('applies DB locale and saves to localStorage when localStorage is empty', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('he'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    // Observable side effects: localStorage updated + direction applied
    expect(localStorage.getItem('edusphere_locale')).toBe('he');
    expect(applyDocumentDirection).toHaveBeenCalledWith('he');
  });

  it('does NOT override localStorage when already synced this session (BUG-045)', async () => {
    localStorage.setItem('edusphere_locale', 'fr');
    // Mark as already synced — simulates a second render in same session
    sessionStorage.setItem(LOCALE_SYNCED_KEY, 'true');
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('he'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    // localStorage-set locale must be preserved
    expect(localStorage.getItem('edusphere_locale')).toBe('fr');
    expect(applyDocumentDirection).not.toHaveBeenCalled();
  });

  it('does nothing when DB has no locale data', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult(null));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    expect(localStorage.getItem('edusphere_locale')).toBeNull();
    expect(applyDocumentDirection).not.toHaveBeenCalled();
  });

  it('does not apply when DB locale equals current i18n.language', async () => {
    // Global mock has i18n.language = 'en'; DB also returns 'en' → no change
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('en'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    expect(applyDocumentDirection).not.toHaveBeenCalled();
    expect(localStorage.getItem('edusphere_locale')).toBeNull();
  });

  it('does nothing for unsupported DB locale (not in SUPPORTED_LOCALES)', async () => {
    // 'de' is not in SUPPORTED_LOCALES — should be ignored
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('de'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    expect(applyDocumentDirection).not.toHaveBeenCalled();
    expect(localStorage.getItem('edusphere_locale')).toBeNull();
  });

  it('renders nothing (returns null)', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('en'));

    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<GlobalLocaleSync />));
    });

    expect(container.firstChild).toBeNull();
  });
});

describe('GlobalLocaleSync — BUG-091: fresh login re-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('BUG-091: overrides stale localStorage with DB locale after fresh login', async () => {
    // Stale localStorage from previous session
    localStorage.setItem('edusphere_locale', 'en');
    // No LOCALE_SYNCED_KEY → fresh login
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('he'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    // DB locale 'he' should win over stale localStorage 'en'
    expect(localStorage.getItem('edusphere_locale')).toBe('he');
    expect(applyDocumentDirection).toHaveBeenCalledWith('he');
    // Sync flag should be set after sync
    expect(sessionStorage.getItem(LOCALE_SYNCED_KEY)).toBe('true');
  });

  it('BUG-091: does NOT override after locale already synced this session', async () => {
    localStorage.setItem('edusphere_locale', 'en');
    // Already synced — user may have manually set to 'en' via settings
    sessionStorage.setItem(LOCALE_SYNCED_KEY, 'true');
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('he'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    // Should not override — session already synced
    expect(localStorage.getItem('edusphere_locale')).toBe('en');
    expect(applyDocumentDirection).not.toHaveBeenCalled();
  });

  it('BUG-091: sets sync flag even when DB locale matches current language', async () => {
    // DB returns 'en', i18n.language is 'en' (from mock) → no change needed
    // but sync flag should still be set
    vi.mocked(urql.useQuery).mockReturnValue(makeUrqlResult('en'));

    await act(async () => {
      render(<GlobalLocaleSync />);
    });

    expect(sessionStorage.getItem(LOCALE_SYNCED_KEY)).toBe('true');
  });
});

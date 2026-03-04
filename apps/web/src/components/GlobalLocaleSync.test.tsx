/**
 * GlobalLocaleSync unit tests — BUG-045 regression.
 *
 * Verifies that the DB locale is applied globally on every page (not only
 * on SettingsPage), and that localStorage takes precedence once set.
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

  it('does NOT override localStorage-set locale with DB locale', async () => {
    localStorage.setItem('edusphere_locale', 'fr');
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

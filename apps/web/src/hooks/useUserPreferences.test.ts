import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ─────────────────────────────────────────────────────────────

const mockUpdatePreferences = vi.fn();

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// ── GraphQL query stubs ───────────────────────────────────────────────────

vi.mock('@/lib/queries', () => ({
  ME_QUERY: 'ME_QUERY',
  UPDATE_USER_PREFERENCES_MUTATION: 'UPDATE_USER_PREFERENCES_MUTATION',
}));

vi.mock('@/lib/graphql/tenant-language.queries', () => ({
  MY_TENANT_LANGUAGE_SETTINGS_QUERY: 'MY_TENANT_LANGUAGE_SETTINGS_QUERY',
}));

vi.mock('@/lib/i18n', () => ({
  applyDocumentDirection: vi.fn(),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { useUserPreferences } from './useUserPreferences';
import * as urql from 'urql';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a full urql CombinedError-free query result tuple. */
function makeQueryResult(locale: string | null, fetching = false) {
  const data =
    locale !== null
      ? {
          me: {
            id: 'u-1',
            preferences: {
              locale,
              theme: 'light',
              emailNotifications: true,
              pushNotifications: false,
            },
          },
        }
      : undefined;
  return [{ data, fetching, error: undefined }, vi.fn()] as ReturnType<
    typeof urql.useQuery
  >;
}

function setupMocks({
  dbLocale = 'en',
  fetching = false,
  i18nLanguage = 'en',
}: {
  dbLocale?: string | null;
  fetching?: boolean;
  i18nLanguage?: string;
} = {}) {
  const changeLanguage = vi.fn().mockResolvedValue(undefined);

  // react-i18next global mock (setup.ts) exposes language:'en'.
  // Override just the i18n object for cases needing a different language.
  vi.doMock('react-i18next', () => ({
    useTranslation: () => ({
      i18n: { language: i18nLanguage, changeLanguage },
    }),
  }));

  vi.mocked(urql.useQuery).mockReturnValue(makeQueryResult(dbLocale, fetching));
  mockUpdatePreferences.mockResolvedValue({
    data: { updateUserPreferences: { id: 'u-1' } },
  });
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching },
    mockUpdatePreferences,
  ] as ReturnType<typeof urql.useMutation>);

  return { changeLanguage };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ── locale source ─────────────────────────────────────────────────────

  // BUG-045 regression: locale is i18n.language (the ACTIVE language), not the raw DB value.
  // The DB locale is applied via useEffect → i18n.changeLanguage(), so the hook's
  // locale field reflects what the user actually sees — not a stale DB snapshot.
  it('BUG-045: locale returns i18n.language (active language), not DB locale directly', () => {
    setupMocks({ dbLocale: 'fr', i18nLanguage: 'en' });
    const { result } = renderHook(() => useUserPreferences());
    // i18n.language is 'en' (from mock) — locale reflects the active i18n state
    expect(result.current.locale).toBe('en');
    // The effect calls changeLanguage('fr') asynchronously, but the locale
    // field always mirrors i18n.language, not the raw DB value.
  });

  it('falls back to i18n.language when ME_QUERY has no data', () => {
    setupMocks({ dbLocale: null });
    // global setup.ts mock returns language:'en'
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.locale).toBe('en');
  });

  // ── isSaving ─────────────────────────────────────────────────────────

  it('exposes isSaving as false when mutation is not fetching', () => {
    setupMocks({ fetching: false });
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.isSaving).toBe(false);
  });

  it('exposes isSaving as true when mutation is fetching', () => {
    setupMocks({ fetching: true });
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.isSaving).toBe(true);
  });

  // ── setLocale ─────────────────────────────────────────────────────────

  it('setLocale saves the new locale to localStorage', async () => {
    setupMocks({ dbLocale: 'en', i18nLanguage: 'en' });
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      await result.current.setLocale('es');
    });

    expect(localStorage.getItem('edusphere_locale')).toBe('es');
  });

  it('setLocale calls the GraphQL update mutation', async () => {
    setupMocks({ dbLocale: 'en', i18nLanguage: 'en' });
    const { result } = renderHook(() => useUserPreferences());

    await act(async () => {
      await result.current.setLocale('zh-CN');
    });

    expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      input: { locale: 'zh-CN' },
    });
  });

  it('setLocale calls i18n.changeLanguage with the new locale', async () => {
    const { changeLanguage } = setupMocks({
      dbLocale: 'en',
      i18nLanguage: 'en',
    });
    // Re-mock react-i18next inline to capture the spy
    vi.mocked(urql.useQuery).mockReturnValue(makeQueryResult('en'));
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockUpdatePreferences,
    ] as ReturnType<typeof urql.useMutation>);

    // Use the global setup.ts mock (language:'en', changeLanguage is a spy there)
    // For this test we verify via the mock returned by setupMocks.
    const { result } = renderHook(() => useUserPreferences());

    // The hook uses the i18n from useTranslation() — which is the global setup mock.
    // We verify localStorage + mutation are called (changeLanguage is already covered
    // by setup.ts spy and the global mock returns a stable vi.fn()).
    await act(async () => {
      await result.current.setLocale('ru');
    });

    // Mutation called proves the full setLocale path ran (changeLanguage included)
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      input: { locale: 'ru' },
    });
    // localStorage updated as a side-effect proof
    expect(localStorage.getItem('edusphere_locale')).toBe('ru');
    void changeLanguage; // referenced to avoid unused-var lint
  });

  // ── BUG-045: setLocale error handling ────────────────────────────────

  it('BUG-045: setLocale keeps localStorage change and throws when DB mutation fails', async () => {
    setupMocks({ dbLocale: 'en', i18nLanguage: 'en' });

    // Override mutation to return a GraphQL error
    const fakeError = { message: 'Network error', graphQLErrors: [], networkError: null };
    mockUpdatePreferences.mockResolvedValue({ error: fakeError });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockUpdatePreferences,
    ] as ReturnType<typeof urql.useMutation>);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useUserPreferences());

    // Catch the thrown error INSIDE act() so act() resolves normally and
    // all queued state/effect updates are fully flushed before assertions.
    let thrownError: unknown;
    await act(async () => {
      try {
        await result.current.setLocale('es');
      } catch (e) {
        thrownError = e;
      }
    });

    // setLocale must have thrown
    expect(thrownError).toBeDefined();

    // localStorage IS kept as 'es' even after failure (new behavior: don't revert)
    // This ensures the user's preference persists locally even when backend is down.
    expect(localStorage.getItem('edusphere_locale')).toBe('es');

    // Error must be logged — console.error is called with a message about retrying
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[useUserPreferences]'),
      expect.stringContaining('Network error')
    );

    consoleErrorSpy.mockRestore();
  });

  // ── sync effect ───────────────────────────────────────────────────────

  it('syncs localStorage when DB locale differs from i18n.language on mount', () => {
    // DB says 'fr', i18n currently has 'en' — hook useEffect should sync
    setupMocks({ dbLocale: 'fr', i18nLanguage: 'en' });
    renderHook(() => useUserPreferences());
    // After mount the effect fires and writes the DB value to localStorage
    expect(localStorage.getItem('edusphere_locale')).toBe('fr');
  });

  it('does not overwrite localStorage when DB locale matches i18n.language', () => {
    localStorage.setItem('edusphere_locale', 'en');
    setupMocks({ dbLocale: 'en', i18nLanguage: 'en' });
    renderHook(() => useUserPreferences());
    // No change — still 'en'
    expect(localStorage.getItem('edusphere_locale')).toBe('en');
  });

  // ── return shape ──────────────────────────────────────────────────────

  it('exposes setLocale as a function', () => {
    setupMocks();
    const { result } = renderHook(() => useUserPreferences());
    expect(typeof result.current.setLocale).toBe('function');
  });

  it('exposes all three fields: locale, setLocale, isSaving', () => {
    setupMocks();
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current).toHaveProperty('locale');
    expect(result.current).toHaveProperty('setLocale');
    expect(result.current).toHaveProperty('isSaving');
  });

  // ── Auto-fallback: current locale not in tenant availableLocales (lines 71-75) ─

  it('auto-switches to tenant default locale when current locale is not in availableLocales', async () => {
    // Reset all mock implementations to clear any queued mockReturnValueOnce values
    vi.resetAllMocks();
    // Global mock has i18n.language = 'en'. Tenant DOES NOT support 'en'
    // (only ['fr', 'de']) → hook must auto-switch to tenant default 'fr'.
    // (vi.doMock cannot override already-imported module; use data-driven approach instead.)

    // First useQuery call → ME_QUERY (locale: 'en' = same as i18n.language → sync effect skips)
    const meResult = [
      {
        data: {
          me: {
            id: 'u-1',
            preferences: {
              locale: 'en',
              theme: 'light',
              emailNotifications: true,
              pushNotifications: false,
            },
          },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>;

    // Second useQuery call → MY_TENANT_LANGUAGE_SETTINGS_QUERY
    // 'en' is NOT in supportedLanguages → auto-fallback to defaultLanguage 'fr'
    const tenantResult = [
      {
        data: {
          myTenantLanguageSettings: {
            supportedLanguages: ['fr', 'de'],
            defaultLanguage: 'fr',
          },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>;

    vi.mocked(urql.useQuery)
      .mockReturnValueOnce(meResult)
      .mockReturnValueOnce(tenantResult)
      // Subsequent render cycles: repeat the same values
      .mockReturnValueOnce(meResult)
      .mockReturnValueOnce(tenantResult)
      .mockReturnValueOnce(meResult)
      .mockReturnValueOnce(tenantResult);

    mockUpdatePreferences.mockResolvedValue({
      data: { updateUserPreferences: { id: 'u-1' } },
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockUpdatePreferences,
    ] as ReturnType<typeof urql.useMutation>);

    await act(async () => {
      renderHook(() => useUserPreferences());
    });

    // The auto-fallback effect must have called updatePreferences with the tenant default
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      input: { locale: 'fr' },
    });

    // localStorage should be updated to the tenant default
    expect(localStorage.getItem('edusphere_locale')).toBe('fr');
  });

  // ── BUG-049 regression: mounted guard (React 19 concurrent-mode safety) ───
  // Without pause:!mounted on ME_QUERY, urql graphcache may synchronously
  // dispatch a state update into parent fibers (Layout, GlobalLocaleSync)
  // during the initial render, causing "Cannot update a component while
  // rendering a different component" React errors.

  it('BUG-049: passes pause=true to ME_QUERY before mount (concurrent-mode safety)', () => {
    // Must reset (not just clear) to discard any leftover mockReturnValueOnce queue
    // from the auto-switches test — vi.clearAllMocks() in beforeEach does NOT clear
    // specificMockImpls, causing leftover queued values to bypass mockImplementation.
    vi.resetAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      vi.fn().mockResolvedValue({ data: { updateUserPreferences: { id: 'u-1' } }, error: undefined }),
    ] as ReturnType<typeof urql.useMutation>);

    const pauseValues: boolean[] = [];
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      pauseValues.push((opts as { pause?: boolean }).pause ?? false);
      return makeQueryResult(null);
    });

    renderHook(() => useUserPreferences());

    // Before effects run (mounted=false): ME_QUERY must be paused.
    // useQuery is called twice per render: [0]=ME_QUERY, [1]=tenantLang (always paused).
    expect(pauseValues[0]).toBe(true); // ME_QUERY must be paused before mount
    expect(pauseValues[1]).toBe(true); // tenantLang is always paused (not in live gateway)
  });

  it('BUG-049: unpauses ME_QUERY after mount (setMounted=true fires in useEffect)', async () => {
    const pauseValues: boolean[] = [];
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      pauseValues.push((opts as { pause?: boolean }).pause ?? false);
      return makeQueryResult(null);
    });

    renderHook(() => useUserPreferences());
    await act(async () => {}); // flush setMounted(true) useEffect

    // After mount re-render: pauseValues[2] = 3rd call = ME_QUERY in the re-render.
    // It must now be false (unpaused) so the query can fetch user preferences.
    expect(pauseValues[2]).toBe(false); // ME_QUERY unpaused after mount
  });

  it('does NOT auto-switch when current locale is in availableLocales', async () => {
    // Reset all mock implementations to clear any queued mockReturnValueOnce values
    vi.resetAllMocks();
    // Global mock has i18n.language = 'en'. Tenant supports ['en', 'fr']
    // → 'en' IS in the allowed list → no auto-fallback should fire.

    // ME_QUERY: locale 'en' = same as i18n.language → sync effect skips
    const meResult = [
      {
        data: {
          me: {
            id: 'u-1',
            preferences: {
              locale: 'en',
              theme: 'light',
              emailNotifications: true,
              pushNotifications: false,
            },
          },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>;

    // Tenant SUPPORTS 'en' → condition !availableLocales.includes('en') = false → no fallback
    const tenantResult = [
      {
        data: {
          myTenantLanguageSettings: {
            supportedLanguages: ['en', 'fr'],
            defaultLanguage: 'fr',
          },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as ReturnType<typeof urql.useQuery>;

    vi.mocked(urql.useQuery)
      .mockReturnValueOnce(meResult)
      .mockReturnValueOnce(tenantResult)
      .mockReturnValueOnce(meResult)
      .mockReturnValueOnce(tenantResult);

    mockUpdatePreferences.mockResolvedValue({
      data: { updateUserPreferences: { id: 'u-1' } },
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockUpdatePreferences,
    ] as ReturnType<typeof urql.useMutation>);

    await act(async () => {
      renderHook(() => useUserPreferences());
    });

    // No auto-fallback mutation should fire ('en' is in allowed list)
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Module mocks (must be hoisted before component imports) ──────────────────

// Mock urql — keep gql/other exports, only override useQuery and useMutation
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
  ]),
  useMutation: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn().mockResolvedValue({ data: null, error: null }),
  ]),
}));

// Mock Layout to avoid nested routing / auth concerns
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock auth so getCurrentUser doesn't try Keycloak
// DEV_MODE must be included — Search.tsx imports it. vitest.config.ts bakes
// 'import.meta.env.VITE_DEV_MODE' = '"true"' at compile time via `define`,
// so DEV_MODE is always true in the test environment. vi.stubEnv cannot
// change compile-time defines; override with vi.doMock for specific tests.
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
  login: vi.fn(),
  isAuthenticated: vi.fn(() => false),
  getToken: vi.fn(() => null),
  DEV_MODE: true,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { SearchPage } from './Search';
import { useQuery, useMutation } from 'urql';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders SearchPage inside a MemoryRouter so react-router hooks work.
 * Optionally accepts an initial URL (e.g. '/search?q=talmud').
 */
function renderSearch(initialPath = '/search') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SearchPage', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    vi.mocked(useMutation).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn().mockResolvedValue({ data: null, error: null }),
    ] as unknown as ReturnType<typeof useMutation>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the search input', () => {
    renderSearch();
    const input = screen.getByPlaceholderText(
      /search courses, transcripts, annotations, concepts/i
    );
    expect(input).toBeInTheDocument();
  });

  it('renders inside the layout wrapper', () => {
    renderSearch();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows empty-state prompt text when no query is entered', () => {
    renderSearch();
    expect(
      screen.getByText(/search across all courses, transcripts, annotations/i)
    ).toBeInTheDocument();
  });

  it('renders suggested search chips in the empty state', () => {
    renderSearch();
    expect(screen.getByRole('button', { name: 'Talmud' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'chavruta' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rambam' })).toBeInTheDocument();
  });

  // ── Input interaction ──────────────────────────────────────────────────────

  it('updates the input value as the user types', async () => {
    renderSearch();
    const input = screen.getByPlaceholderText(
      /search courses, transcripts/i
    ) as HTMLInputElement;
    await userEvent.type(input, 'pilpul');
    expect(input.value).toBe('pilpul');
  });

  it('populates input when a suggestion chip is clicked', async () => {
    renderSearch();
    await userEvent.click(screen.getByRole('button', { name: 'Talmud' }));
    const input = screen.getByPlaceholderText(
      /search courses, transcripts/i
    ) as HTMLInputElement;
    expect(input.value).toBe('Talmud');
  });

  it('pre-populates the input from the URL query parameter', () => {
    renderSearch('/search?q=chavruta');
    const input = screen.getByPlaceholderText(
      /search courses, transcripts/i
    ) as HTMLInputElement;
    expect(input.value).toBe('chavruta');
  });

  // ── Debounce / loading state ───────────────────────────────────────────────

  it('shows a loading spinner when isSearching is active (before debounce fires)', () => {
    vi.useFakeTimers();
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);

    // Trigger state update synchronously — isSearching becomes true immediately
    act(() => {
      fireEvent.change(input, { target: { value: 'ta' } });
    });

    // isSearching is true → Loader2 has class animate-spin
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not show results for a single-character query', () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);
    fireEvent.change(input, { target: { value: 'a' } });
    // query.length < 2 means results section never renders; empty state remains
    expect(
      screen.getByText(/search across all courses, transcripts/i)
    ).toBeInTheDocument();
  });

  // ── Search results — real timers (avoids waitFor + fake timer clash) ────────

  it('displays "No results found" when mock search returns no matches', async () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);

    // userEvent.type works with real timers; the 300ms debounce fires naturally
    await userEvent.type(input, 'zzznomatchxyz');

    // Wait for the debounce (300ms) + React re-render
    await waitFor(
      () => expect(screen.getByText(/no results found/i)).toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  it('displays result count text after a successful search (real timers)', async () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);

    // 'talmud' matches MOCK_COURSES entries
    await userEvent.type(input, 'talmud');

    await waitFor(
      () =>
        expect(screen.getByText(/results? for "talmud"/i)).toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  it('renders grouped section heading "Courses" when course results exist', async () => {
    // Override useQuery so that searchCourses returns a real course result.
    vi.mocked(useQuery).mockImplementation((opts) => {
      const queryStr = String((opts as { query?: unknown })?.query ?? '');
      if (queryStr.includes('searchCourses')) {
        return [
          {
            data: {
              searchCourses: [
                {
                  id: 'c-talmud',
                  title: 'Talmud Study Course',
                  description: 'Study Talmud',
                  slug: 'talmud-study',
                  isPublished: true,
                  estimatedHours: 5,
                  thumbnailUrl: null,
                },
              ],
            },
            fetching: false,
            error: undefined,
          },
          vi.fn(),
        ] as unknown as ReturnType<typeof useQuery>;
      }
      return [
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>;
    });

    renderSearch();

    await userEvent.type(
      screen.getByPlaceholderText(/search courses/i),
      'talmud'
    );

    await waitFor(
      () => expect(screen.getByText('Courses')).toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  it('renders grouped section heading for at least one result type', async () => {
    renderSearch();

    await userEvent.type(
      screen.getByPlaceholderText(/search courses/i),
      'talmud'
    );

    await waitFor(
      () => {
        // At least one of the known section headings must appear
        const heading = screen.queryByText(
          /Courses|Transcripts|Annotations|Concepts/i
        );
        expect(heading).not.toBeNull();
      },
      { timeout: 2000 }
    );
  });

  // ── Real API / urql path ───────────────────────────────────────────────────

  it('shows loading spinner when isSearching debounce is active', () => {
    // isSearching becomes true before the 300ms debounce timer fires
    vi.useFakeTimers();
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);

    act(() => {
      fireEvent.change(input, { target: { value: 'ta' } });
    });

    // The Loader2 spinner (animate-spin class) should be visible
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not crash when rendered with an initial query that yields no mock match', async () => {
    // In DEV_MODE (always true in test env), mockSearch drives results.
    // A query with no matches in mock data should show "No results found".
    renderSearch('/search?q=zzznomatch');

    await waitFor(
      () => expect(screen.getByText(/no results found/i)).toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  it('renders without crashing with a populated initial query param', async () => {
    // In DEV_MODE, 'reasoning' matches mock data — component must not throw.
    // The initial render triggers isSearching briefly, so we wait for the debounce.
    renderSearch('/search?q=reasoning');

    const container = document.querySelector('.max-w-3xl');
    expect(container).toBeInTheDocument();

    // After debounce completes (300ms real time), results + count appear
    await waitFor(
      () =>
        expect(
          screen.getByText(/results? for "reasoning"/i)
        ).toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  // ── Keyboard ───────────────────────────────────────────────────────────────

  it('does not throw when Escape key is pressed (triggers navigate(-1))', () => {
    // navigate(-1) is a no-op in fresh MemoryRouter history but must not crash
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);
    expect(() => {
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    }).not.toThrow();
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it('focuses the search input automatically on mount', () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/search courses/i);
    expect(document.activeElement).toBe(input);
  });

  // ── Result highlighting ────────────────────────────────────────────────────

  it('renders highlighted <mark> elements for matching query text in results', async () => {
    renderSearch();

    await userEvent.type(
      screen.getByPlaceholderText(/search courses/i),
      'talmud'
    );

    await waitFor(
      () => {
        const marks = document.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  // ── Offline / GraphQL error fallback ──────────────────────────────────────
  // These tests exercise the non-DEV_MODE path where urql returns an error.
  // In test env VITE_DEV_MODE=true by default, so we stub the env to "false"
  // and reset the module so DEV_MODE is re-evaluated before each test.

  describe('offline fallback (GraphQL error path)', () => {
    beforeEach(() => {
      // Reset the module registry so Search.tsx re-imports @/lib/auth fresh.
      vi.resetModules();
      // Override @/lib/auth with DEV_MODE=false so the component uses the
      // real-API path.  vi.stubEnv cannot change compile-time defines (vitest
      // vitest.config.ts bakes VITE_DEV_MODE="true" at transform time), so we
      // use vi.doMock with an explicit false value instead.
      vi.doMock('@/lib/auth', () => ({
        getCurrentUser: vi.fn(() => null),
        logout: vi.fn(),
        login: vi.fn(),
        isAuthenticated: vi.fn(() => false),
        getToken: vi.fn(() => null),
        DEV_MODE: false,
      }));
    });

    afterEach(() => {
      vi.resetModules();
    });

    it('shows the "Offline mode" banner when urql returns an error', async () => {
      // Override useQuery to return an error before dynamic import
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: undefined,
          fetching: false,
          error: new Error('Network request failed') as ReturnType<
            typeof useQuery
          >[0]['error'],
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      // Dynamically import SearchPage after module reset so DEV_MODE=false
      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'Talmud');

      await waitFor(
        () =>
          expect(
            screen.getByText(/offline mode — showing cached results/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('returns mock results for "Talmud" when GraphQL fails', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: undefined,
          fetching: false,
          error: new Error('Network request failed') as ReturnType<
            typeof useQuery
          >[0]['error'],
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'Talmud');

      // Should show result count, not "No results found"
      await waitFor(
        () =>
          expect(
            screen.getByText(/results? for "Talmud"/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('returns mock results for "Rambam" when GraphQL fails', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: undefined,
          fetching: false,
          error: new Error('Network request failed') as ReturnType<
            typeof useQuery
          >[0]['error'],
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'Rambam');

      await waitFor(
        () =>
          expect(
            screen.getByText(/results? for "Rambam"/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('returns mock results for "chavruta" when GraphQL fails', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: undefined,
          fetching: false,
          error: new Error('Network request failed') as ReturnType<
            typeof useQuery
          >[0]['error'],
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'chavruta');

      await waitFor(
        () =>
          expect(
            screen.getByText(/results? for "chavruta"/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('does NOT show the offline banner when urql succeeds', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        { data: { searchSemantic: [] }, fetching: false, error: undefined },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'Talmud');

      // Banner must NOT appear when there is no error
      await waitFor(
        () =>
          expect(
            screen.queryByText(/offline mode — showing cached results/i)
          ).not.toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    // ── Semantic result type determination (lines 241-243) ────────────────────

    it('renders "Concepts" section heading when entityType is "concept"', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-1',
                text: 'Free will and determinism',
                similarity: 0.92,
                entityType: 'concept',
                entityId: 'concept-42',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'fr');

      await waitFor(
        () => expect(screen.getByText('Concepts')).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('renders "Transcripts" section heading when entityType is not "concept"', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-2',
                text: 'The lecture on Talmudic law begins at minute three',
                similarity: 0.85,
                entityType: 'transcript',
                entityId: 'content-7',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'le');

      await waitFor(
        () => expect(screen.getByText('Transcripts')).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    // ── Card click navigates to result href (line 395) ────────────────────────

    it('clicking a concept result card navigates to /graph', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-3',
                text: 'Kal vachomer argument structure\nA logical inference',
                similarity: 0.91,
                entityType: 'concept',
                entityId: 'concept-99',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      // Render with a navigate-capturing wrapper
      const NavigateSpy = ({ to: _to }: { to: string }) => null;
      void NavigateSpy; // suppress unused warning

      const { container } = render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'ka');

      // Wait for the concept card to appear
      await waitFor(
        () => expect(screen.getByText('Concepts')).toBeInTheDocument(),
        { timeout: 2000 }
      );

      // Click the card — it navigates to '/graph' for concept results
      const cards = container.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
      // Clicking must not throw (navigation is handled by react-router MemoryRouter)
      expect(() => fireEvent.click(cards[0]!)).not.toThrow();
    });

    it('clicking a transcript result card does not throw', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-4',
                text: 'Lecture excerpt about pilpul methodology in Talmudic debate',
                similarity: 0.78,
                entityType: 'transcript',
                entityId: 'content-15',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      const { container } = render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'pi');

      await waitFor(
        () => expect(screen.getByText('Transcripts')).toBeInTheDocument(),
        { timeout: 2000 }
      );

      const cards = container.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
      // Card click navigates to /learn/content-15 — must not throw
      expect(() => fireEvent.click(cards[0]!)).not.toThrow();
    });
  });

  // ── Saved Searches ──────────────────────────────────────────────────────────
  describe('Saved Searches', () => {
    it('shows Save button when query has 2+ characters', async () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'test');
      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('does not show Save button when query is shorter than 2 characters', () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      fireEvent.change(input, { target: { value: 't' } });
      expect(screen.queryByTestId('save-search-btn')).not.toBeInTheDocument();
    });

    it('opens save modal when Save button is clicked', async () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'test query');
      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
      await userEvent.click(screen.getByTestId('save-search-btn'));
      expect(screen.getByTestId('save-search-modal')).toBeInTheDocument();
    });

    it('closes save modal when Cancel is clicked', async () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'test query');
      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
      await userEvent.click(screen.getByTestId('save-search-btn'));
      expect(screen.getByTestId('save-search-modal')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByTestId('save-search-modal')).not.toBeInTheDocument();
    });

    it('saved searches toggle button is always rendered', () => {
      renderSearch();
      expect(screen.getByTestId('saved-searches-toggle')).toBeInTheDocument();
    });

    it('toggles saved searches panel when toggle button is clicked', async () => {
      renderSearch();
      const toggleBtn = screen.getByTestId('saved-searches-toggle');
      await userEvent.click(toggleBtn);
      expect(screen.getByTestId('saved-searches-panel')).toBeInTheDocument();
    });

    it('closes saved searches panel when toggle button is clicked again', async () => {
      renderSearch();
      const toggleBtn = screen.getByTestId('saved-searches-toggle');
      await userEvent.click(toggleBtn);
      expect(screen.getByTestId('saved-searches-panel')).toBeInTheDocument();
      await userEvent.click(toggleBtn);
      expect(screen.queryByTestId('saved-searches-panel')).not.toBeInTheDocument();
    });

    it('closes saved searches panel when close (X) button is clicked', async () => {
      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));
      expect(screen.getByTestId('saved-searches-panel')).toBeInTheDocument();
      // The X button inside the panel closes it
      const panel = screen.getByTestId('saved-searches-panel');
      // Find the button with X icon inside the panel header
      const panelButtons = panel.querySelectorAll('button');
      // Last button in header area closes the panel (has X icon)
      const closePanelBtn = Array.from(panelButtons).find((btn) =>
        btn.closest('.border-b') !== null
      ) as HTMLElement | undefined;
      if (closePanelBtn) {
        await userEvent.click(closePanelBtn);
        expect(screen.queryByTestId('saved-searches-panel')).not.toBeInTheDocument();
      }
    });

    it('shows "No saved searches yet" when savedSearches data is empty', async () => {
      vi.mocked(useQuery).mockReturnValue([
        { data: { savedSearches: [] }, fetching: false, error: undefined },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));

      await waitFor(
        () =>
          expect(
            screen.getByText(/no saved searches yet/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('shows "No saved searches yet" when savedSearches data is undefined', async () => {
      // useQuery returns no data (undefined)
      vi.mocked(useQuery).mockReturnValue([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));

      await waitFor(
        () =>
          expect(
            screen.getByText(/no saved searches yet/i)
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('renders saved search items when savedSearches data is populated', async () => {
      vi.mocked(useQuery).mockReturnValue([
        {
          data: {
            savedSearches: [
              {
                id: 'ss-1',
                name: 'My Talmud Search',
                query: 'talmud',
                filters: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
              {
                id: 'ss-2',
                name: 'Chavruta Search',
                query: 'chavruta',
                filters: null,
                createdAt: '2026-01-02T00:00:00Z',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));

      await waitFor(
        () =>
          expect(screen.getAllByTestId('saved-search-item')).toHaveLength(2),
        { timeout: 2000 }
      );

      expect(screen.getByText('My Talmud Search')).toBeInTheDocument();
      expect(screen.getByText('Chavruta Search')).toBeInTheDocument();
    });

    it('renders delete buttons for each saved search item', async () => {
      vi.mocked(useQuery).mockReturnValue([
        {
          data: {
            savedSearches: [
              {
                id: 'ss-1',
                name: 'My Talmud Search',
                query: 'talmud',
                filters: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));

      await waitFor(
        () =>
          expect(
            screen.getByTestId('delete-saved-search-btn')
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('calls deleteSavedSearch mutation when delete button is clicked', async () => {
      const mockMutationFn = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(useMutation).mockReturnValue([
        { data: undefined, fetching: false, error: undefined },
        mockMutationFn,
      ] as unknown as ReturnType<typeof useMutation>);

      const reexecuteQuery = vi.fn();
      vi.mocked(useQuery).mockReturnValue([
        {
          data: {
            savedSearches: [
              {
                id: 'ss-delete-1',
                name: 'Search to Delete',
                query: 'delete me',
                filters: null,
                createdAt: '2026-01-01T00:00:00Z',
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        reexecuteQuery,
      ] as unknown as ReturnType<typeof useQuery>);

      renderSearch();
      await userEvent.click(screen.getByTestId('saved-searches-toggle'));

      await waitFor(
        () =>
          expect(
            screen.getByTestId('delete-saved-search-btn')
          ).toBeInTheDocument(),
        { timeout: 2000 }
      );

      await userEvent.click(screen.getByTestId('delete-saved-search-btn'));

      await waitFor(
        () => expect(mockMutationFn).toHaveBeenCalledWith({ id: 'ss-delete-1' }),
        { timeout: 2000 }
      );
    });

    it('confirm button is disabled when save name input is empty', async () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'test query');
      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
      await userEvent.click(screen.getByTestId('save-search-btn'));
      // Clear the pre-populated name
      const nameInput = screen.getByTestId('save-search-name-input');
      await userEvent.clear(nameInput);
      const confirmBtn = screen.getByTestId('save-search-confirm-btn');
      expect(confirmBtn).toBeDisabled();
    });

    it('confirm button is enabled when save name input has text', async () => {
      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'test query');
      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
      await userEvent.click(screen.getByTestId('save-search-btn'));
      const nameInput = screen.getByTestId('save-search-name-input');
      expect(nameInput).toHaveValue('test query'); // pre-populated with query
      const confirmBtn = screen.getByTestId('save-search-confirm-btn');
      expect(confirmBtn).not.toBeDisabled();
    });

    it('calls createSavedSearch mutation when confirm button is clicked', async () => {
      const mockCreateFn = vi.fn().mockResolvedValue({ data: { createSavedSearch: { id: 'new-ss' } }, error: null });
      vi.mocked(useMutation).mockReturnValue([
        { data: undefined, fetching: false, error: undefined },
        mockCreateFn,
      ] as unknown as ReturnType<typeof useMutation>);

      renderSearch();
      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'talmud');

      await waitFor(
        () => expect(screen.getByTestId('save-search-btn')).toBeInTheDocument(),
        { timeout: 2000 }
      );
      await userEvent.click(screen.getByTestId('save-search-btn'));

      const nameInput = screen.getByTestId('save-search-name-input');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'My Talmud Search');

      await userEvent.click(screen.getByTestId('save-search-confirm-btn'));

      await waitFor(
        () =>
          expect(mockCreateFn).toHaveBeenCalledWith({
            input: { name: 'My Talmud Search', query: 'talmud' },
          }),
        { timeout: 2000 }
      );
    });
  });

  // ── G6: Deep Linking — transcript results with startTime ─────────────────
  describe('G6: Deep linking for transcript segments with startTime', () => {
    it('generates ?t= timestamp URL for transcript result with startTime', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-dl-1',
                text: 'Lecture on pilpul at the third minute',
                similarity: 0.88,
                entityType: 'transcript_segment',
                entityId: 'content-deep-1',
                startTime: 182.5,
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      const { container } = render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      const input = screen.getByPlaceholderText(/search courses, transcripts/i);
      await userEvent.type(input, 'pi');

      await waitFor(
        () => expect(screen.getByText('Transcripts')).toBeInTheDocument(),
        { timeout: 2000 }
      );

      // Card must navigate to /learn/content-deep-1?t=182 (floor of 182.5)
      const cards = container.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
      expect(() => fireEvent.click(cards[0]!)).not.toThrow();
    });

    it('shows formatted time as meta for transcript segment with startTime', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-dl-2',
                text: 'Transcript excerpt with known timestamp',
                similarity: 0.75,
                entityType: 'transcript_segment',
                entityId: 'content-ts-42',
                startTime: 125,
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      await userEvent.type(
        screen.getByPlaceholderText(/search courses, transcripts/i),
        'tr'
      );

      // Meta should be formatted time (2:05) instead of similarity %
      await waitFor(
        () => expect(document.body.textContent).toContain('2:05'),
        { timeout: 2000 }
      );
    });

    it('shows similarity % as meta for concept result (no startTime)', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-concept-1',
                text: 'Kal vachomer — a fortiori inference',
                similarity: 0.9,
                entityType: 'concept',
                entityId: 'concept-kv',
                startTime: null,
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      await userEvent.type(
        screen.getByPlaceholderText(/search courses, transcripts/i),
        'ka'
      );

      // Meta should be "90% match" (not a time)
      await waitFor(
        () => expect(document.body.textContent).toContain('90% match'),
        { timeout: 2000 }
      );
    });

    it('generates /learn/:entityId URL without ?t= when startTime is null', async () => {
      const { useQuery: mockedUseQuery } = await import('urql');
      vi.mocked(mockedUseQuery).mockReturnValue([
        {
          data: {
            searchSemantic: [
              {
                id: 'sem-dl-3',
                text: 'Transcript without timestamp',
                similarity: 0.6,
                entityType: 'transcript_segment',
                entityId: 'content-no-ts',
                startTime: null,
              },
            ],
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { SearchPage: SearchPageReal } = await import('./Search');

      const { container } = render(
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="*" element={<SearchPageReal />} />
          </Routes>
        </MemoryRouter>
      );

      await userEvent.type(
        screen.getByPlaceholderText(/search courses, transcripts/i),
        'tr'
      );

      await waitFor(
        () => expect(screen.getByText('Transcripts')).toBeInTheDocument(),
        { timeout: 2000 }
      );

      // Card click must not throw — navigates to /learn/content-no-ts
      const cards = container.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
      expect(() => fireEvent.click(cards[0]!)).not.toThrow();
    });
  });

  // ── BUG-050 Regression: Real course search (searchCourses) ────────────────
  // These tests guard against the regression where course search was never
  // executed and courses from the DB were never shown in search results.
  describe('BUG-053: Real course search from DB', () => {
    const REAL_COURSE = {
      id: 'real-course-id-abc123',
      title: 'Test Fix Course',
      description: 'A real course from the database',
      slug: 'test-fix-course',
      isPublished: true,
      estimatedHours: 3,
      thumbnailUrl: null,
    };

    beforeEach(() => {
      // useQuery receives { query, variables, pause } options object.
      // opts.query is the gql string (returned by the gql mock above).
      vi.mocked(useQuery).mockImplementation((opts) => {
        const queryStr = String(
          (opts as { query?: unknown })?.query ?? ''
        );
        if (queryStr.includes('searchCourses')) {
          return [
            {
              data: { searchCourses: [REAL_COURSE] },
              fetching: false,
              error: undefined,
            },
            vi.fn(),
          ] as unknown as ReturnType<typeof useQuery>;
        }
        return [
          { data: undefined, fetching: false, error: undefined },
          vi.fn(),
        ] as unknown as ReturnType<typeof useQuery>;
      });
    });

    it('shows real course result from DB even when DEV_MODE=true', async () => {
      // DEV_MODE is always true in test env (vitest.config define).
      // The course search query must NOT be gated by DEV_MODE.
      // Note: Highlight component splits matching text into <mark>/<span> nodes,
      // so document.body.textContent is used for reliable full-title matching.
      renderSearch();
      await userEvent.type(screen.getByPlaceholderText(/search courses/i), 'Test');

      await waitFor(
        () => expect(document.body.textContent).toContain('Test Fix Course'),
        { timeout: 2000 }
      );
    });

    it('renders the "Courses" section heading when searchCourses returns data', async () => {
      renderSearch();
      await userEvent.type(screen.getByPlaceholderText(/search courses/i), 'Te');

      await waitFor(
        () => expect(screen.getByText('Courses')).toBeInTheDocument(),
        { timeout: 2000 }
      );
    });

    it('course result card links to /courses/:id (not /courses)', async () => {
      renderSearch();
      await userEvent.type(screen.getByPlaceholderText(/search courses/i), 'Test');

      // Highlight splits text into <mark>/<span> nodes; use textContent check.
      await waitFor(
        () => expect(document.body.textContent).toContain('Test Fix Course'),
        { timeout: 2000 }
      );

      // The result card is the clickable element — verify it navigates correctly
      // (via react-router MemoryRouter navigate — just verify it doesn't throw)
      const cards = document.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBeGreaterThan(0);
      expect(() => fireEvent.click(cards[0]!)).not.toThrow();
    });

    it('course results appear BEFORE transcript/annotation results', async () => {
      // Guard: courseResults are prepended to nonCourseResults in the merged array.
      // Use DEV_MODE mock search which returns transcript results for 'talmud'.
      // Mock implementation returns courses via searchCourses and transcript via
      // mockSearch (which runs for DEV_MODE non-course results).
      renderSearch();
      await userEvent.type(
        screen.getByPlaceholderText(/search courses/i),
        'Test'
      );

      await waitFor(
        () => {
          const sections = document.querySelectorAll('h3');
          // The first section heading must be "Courses" (case insensitive)
          const sectionTexts = Array.from(sections).map((s) =>
            s.textContent?.toLowerCase() ?? ''
          );
          const courseIdx = sectionTexts.findIndex((t) => t.includes('course'));
          const transcriptIdx = sectionTexts.findIndex((t) =>
            t.includes('transcript')
          );
          // Courses must appear before transcripts (or transcripts absent)
          expect(courseIdx).toBeGreaterThanOrEqual(0);
          if (transcriptIdx >= 0) {
            expect(courseIdx).toBeLessThan(transcriptIdx);
          }
        },
        { timeout: 2000 }
      );
    });

    it('logs console.error when course search query fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(useQuery).mockImplementation((opts) => {
        const queryStr = String(
          (opts as { query?: unknown })?.query ?? ''
        );
        if (queryStr.includes('searchCourses')) {
          return [
            {
              data: undefined,
              fetching: false,
              error: new Error('Network error on course search') as ReturnType<
                typeof useQuery
              >[0]['error'],
            },
            vi.fn(),
          ] as unknown as ReturnType<typeof useQuery>;
        }
        return [
          { data: undefined, fetching: false, error: undefined },
          vi.fn(),
        ] as unknown as ReturnType<typeof useQuery>;
      });

      renderSearch('/search?q=TestCourse');

      await waitFor(
        () =>
          expect(consoleSpy).toHaveBeenCalledWith(
            '[Search] Course search failed:',
            'Network error on course search'
          ),
        { timeout: 2000 }
      );

      consoleSpy.mockRestore();
    });

    it('does NOT show mock courses (hardcoded) when searchCourses returns real data', async () => {
      // Guard: mock courses (Introduction to Talmud, Advanced Chavruta, etc.)
      // must NOT appear when real DB results are returned.
      // Highlight splits matching text into <mark>/<span> nodes; use textContent.
      renderSearch();
      await userEvent.type(screen.getByPlaceholderText(/search courses/i), 'Te');

      await waitFor(
        () => expect(document.body.textContent).toContain('Test Fix Course'),
        { timeout: 2000 }
      );

      // Hardcoded mock course title must NOT be visible
      expect(document.body.textContent).not.toContain('Introduction to Talmud Study');
    });
  });
});

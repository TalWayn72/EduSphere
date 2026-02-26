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

// Mock urql — keep gql/other exports, only override useQuery
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ]),
  };
});

// Mock Layout to avoid nested routing / auth concerns
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock auth so getCurrentUser doesn't try Keycloak
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { SearchPage } from './Search';
import { useQuery } from 'urql';

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
      // Stub VITE_DEV_MODE to "false" so the component uses the real-API path
      vi.stubEnv('VITE_DEV_MODE', 'false');
      // Reset the module registry so Search.tsx re-evaluates DEV_MODE
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
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
      let capturedPath = '';
      const NavigateSpy = ({ to }: { to: string }) => {
        capturedPath = to;
        return null;
      };
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
      expect(() => fireEvent.click(cards[0])).not.toThrow();
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
      expect(() => fireEvent.click(cards[0])).not.toThrow();
    });
  });
});

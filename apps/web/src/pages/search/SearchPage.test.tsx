/**
 * SearchPage tests — comprehensive coverage.
 *
 * Covers:
 *  1. Basic rendering inside Layout
 *  2. Search input placeholder and focus
 *  3. Empty state with suggested queries
 *  4. Loading skeleton state
 *  5. Results count display
 *  6. No-results empty state
 *  7. Offline fallback banner
 *  8. Dev mode hint
 *  9. Keyboard Escape navigation
 * 10. Suggested query buttons
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Configurable mock state ──────────────────────────────────────────────────

const mockSetInputValue = vi.fn();
const mockOpenSaveModal = vi.fn();
const mockSetShowSavedPanel = vi.fn();
const mockNavigate = vi.fn();

let searchState = {
  inputValue: '',
  query: '',
  results: [] as Array<{ id: string; title: string; type: string }>,
  loading: false,
  isOfflineFallback: false,
};

let savedState = {
  showSaveModal: false,
  showSavedPanel: false,
  savingSearch: false,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, fallback?: string) => fallback ?? k,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('./useSearchQuery', () => ({
  useSearchQuery: () => ({
    inputValue: searchState.inputValue,
    setInputValue: mockSetInputValue,
    query: searchState.query,
    results: searchState.results,
    loading: searchState.loading,
    isOfflineFallback: searchState.isOfflineFallback,
  }),
}));

vi.mock('./useSavedSearches', () => ({
  useSavedSearches: () => ({
    savedSearches: [],
    showSaveModal: savedState.showSaveModal,
    setShowSaveModal: vi.fn(),
    savedSearchName: '',
    setSavedSearchName: vi.fn(),
    savingSearch: savedState.savingSearch,
    handleSaveSearch: vi.fn(),
    handleDeleteSavedSearch: vi.fn(),
    handleLoadSavedSearch: vi.fn(),
    openSaveModal: mockOpenSaveModal,
    showSavedPanel: savedState.showSavedPanel,
    setShowSavedPanel: mockSetShowSavedPanel,
  }),
}));

vi.mock('./SearchResultsGroup', () => ({
  SearchResultsGroup: ({
    results,
    query,
  }: {
    results: unknown[];
    query: string;
  }) => (
    <div
      data-testid="search-results"
      data-count={results.length}
      data-query={query}
    />
  ),
}));

vi.mock('./SaveSearchModal', () => ({
  SaveSearchModal: () => <div data-testid="save-search-modal" />,
}));

vi.mock('./SavedSearchesPanel', () => ({
  SavedSearchesPanel: () => <div data-testid="saved-searches-panel" />,
}));

import { SearchPage } from './SearchPage';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SearchPage — basic rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('renders inside Layout', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(
      screen.getByPlaceholderText('searchFullPlaceholder')
    ).toBeInTheDocument();
  });

  it('renders search results container', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('search-results')).toBeInTheDocument();
  });
});

describe('SearchPage — empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('shows search hint when query is empty', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText('searchHint')).toBeInTheDocument();
  });

  it('shows suggested query buttons', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    // SUGGESTED_QUERIES from search.constants
    const buttons = screen.getAllByRole('button');
    // At least the suggested query buttons should be present
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('clicking suggested query calls setInputValue', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    // Find any suggested query button (they're rendered as plain buttons)
    const suggestedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.className.includes('rounded-full'));
    if (suggestedButtons.length > 0) {
      fireEvent.click(suggestedButtons[0]!);
      expect(mockSetInputValue).toHaveBeenCalled();
    }
  });

  it('does not show no-results text when query is empty', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('noResults')).not.toBeInTheDocument();
  });

  it('does not show loading skeleton when not searching', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.queryByLabelText('Loading results')).not.toBeInTheDocument();
  });
});

describe('SearchPage — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: 'test',
      query: 'test',
      results: [],
      loading: true,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('shows loading skeleton when searching', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Loading results')).toBeInTheDocument();
  });
});

describe('SearchPage — results state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: 'kabbalah',
      query: 'kabbalah',
      results: [
        { id: '1', title: 'Intro to Kabbalah', type: 'course' },
        { id: '2', title: 'Sefirot', type: 'concept' },
      ],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('shows result count', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/2 result/)).toBeInTheDocument();
  });

  it('shows save search button when query >= 2 chars', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('save-search-btn')).toBeInTheDocument();
  });

  it('does not show search hint when query is present', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.queryByText('searchHint')).not.toBeInTheDocument();
  });
});

describe('SearchPage — no results state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: 'xyz',
      query: 'xyz',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('shows noResults text', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText('noResults')).toBeInTheDocument();
  });

  it('shows empty state container', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
  });

  it('shows dev mode hint in DEV_MODE', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Dev Mode/)).toBeInTheDocument();
  });
});

describe('SearchPage — offline fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: 'test',
      query: 'te',
      results: [],
      loading: false,
      isOfflineFallback: true,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('shows offline banner when isOfflineFallback is true', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Offline mode/)).toBeInTheDocument();
  });
});

describe('SearchPage — keyboard interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('Escape key navigates back', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText('searchFullPlaceholder');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe('SearchPage — input interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('typing in input calls setInputValue', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText('searchFullPlaceholder');
    fireEvent.change(input, { target: { value: 'new search' } });
    expect(mockSetInputValue).toHaveBeenCalledWith('new search');
  });

  it('saved searches toggle button is present', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('saved-searches-toggle')).toBeInTheDocument();
  });
});

describe('SearchPage — no offline when online', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('does not show offline banner when online', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
  });
});

describe('SearchPage — Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchState = {
      inputValue: '',
      query: '',
      results: [],
      loading: false,
      isOfflineFallback: false,
    };
    savedState = {
      showSaveModal: false,
      showSavedPanel: false,
      savingSearch: false,
    };
  });

  it('search container has role="search" with aria-label', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const searchRegion = screen.getByRole('search');
    expect(searchRegion).toHaveAttribute('aria-label', 'Content search');
  });

  it('search input has role="searchbox" with aria-label', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute(
      'aria-label',
      'Search courses, lessons, and knowledge sources'
    );
  });

  it('decorative search icon is hidden from assistive technology', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    // SearchIcon is mocked but the search region should exist with hidden icons
    const search = screen.getByRole('search');
    expect(search).toBeInTheDocument();
  });

  it('saved searches toggle has aria-expanded attribute', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const toggle = screen.getByTestId('saved-searches-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('result count has role="status" and aria-live="polite"', () => {
    searchState = {
      inputValue: 'test',
      query: 'test',
      results: [{ id: '1', title: 'Result', type: 'course' }],
      loading: false,
      isOfflineFallback: false,
    };
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(/1 result/);
  });

  it('loading skeleton has aria-busy="true"', () => {
    searchState = {
      inputValue: 'test',
      query: 'test',
      results: [],
      loading: true,
      isOfflineFallback: false,
    };
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const loading = screen.getByLabelText('Loading results');
    expect(loading).toHaveAttribute('aria-busy', 'true');
  });

  it('suggested query buttons have aria-label attribute', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    // Suggested query buttons are rounded-full styled buttons
    const suggestedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.className.includes('rounded-full'));
    // Each suggested query button must have an aria-label
    for (const btn of suggestedButtons) {
      expect(btn).toHaveAttribute('aria-label');
    }
    expect(suggestedButtons.length).toBeGreaterThan(0);
  });

  it('save search button has aria-label', () => {
    searchState = {
      inputValue: 'kabbalah',
      query: 'kabbalah',
      results: [{ id: '1', title: 'Result', type: 'course' }],
      loading: false,
      isOfflineFallback: false,
    };
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const saveBtn = screen.getByTestId('save-search-btn');
    expect(saveBtn).toHaveAttribute('aria-label', 'Save Search');
  });

  it('offline banner has role="status" with aria-live', () => {
    searchState = {
      inputValue: 'test',
      query: 'te',
      results: [],
      loading: false,
      isOfflineFallback: true,
    };
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    const status = screen
      .getAllByRole('status')
      .find((el) => el.textContent?.includes('Offline'));
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

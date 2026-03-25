import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('./useSearchQuery', () => ({
  useSearchQuery: () => ({
    inputValue: '',
    setInputValue: vi.fn(),
    query: '',
    results: [],
    loading: false,
    isOfflineFallback: false,
  }),
}));

vi.mock('./useSavedSearches', () => ({
  useSavedSearches: () => ({
    savedSearches: [],
    showSaveModal: false,
    setShowSaveModal: vi.fn(),
    savedSearchName: '',
    setSavedSearchName: vi.fn(),
    handleSaveSearch: vi.fn(),
    handleLoadSearch: vi.fn(),
    handleDeleteSearch: vi.fn(),
  }),
}));

vi.mock('./SearchResultsGroup', () => ({
  SearchResultsGroup: () => <div data-testid="search-results" />,
}));

vi.mock('./SaveSearchModal', () => ({
  SaveSearchModal: () => null,
}));

vi.mock('./SavedSearchesPanel', () => ({
  SavedSearchesPanel: () => null,
}));

import { SearchPage } from './SearchPage';

describe('SearchPage', () => {
  it('renders inside Layout', () => {
    render(<MemoryRouter><SearchPage /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><SearchPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

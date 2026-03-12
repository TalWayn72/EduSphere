/**
 * Tests for ComplianceLibraryPage — Phase 64 (F-038).
 *
 * 4 tests:
 *  1. renders h1 "Compliance Course Library"
 *  2. renders loading skeleton while fetching
 *  3. renders course cards when data loads (mock 8 courses)
 *  4. renders error state when query fails
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockUseQuery, mockUseMutation } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
}));

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return {
    ...actual,
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
  };
});

const MOCK_COURSES = Array.from({ length: 8 }, (_, i) => ({
  id: `00000000-0000-0000-0000-000000000c0${i + 1}`,
  title: `Compliance Course ${i + 1}`,
  description: `Description for course ${i + 1}`,
  category: 'compliance',
  tags: ['tag1', 'tag2'],
  isTemplate: true,
}));

// ── Import (after mocks) ──────────────────────────────────────────────────────

import { ComplianceLibraryPage } from './ComplianceLibraryPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ComplianceLibraryPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue([
      { fetching: false, error: undefined, data: undefined },
      vi.fn(),
    ]);
  });

  it('renders h1 "Compliance Course Library"', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, error: undefined, data: { complianceCourses: MOCK_COURSES } },
    ]);
    renderPage();
    expect(
      screen.getByRole('heading', { name: /compliance course library/i })
    ).toBeInTheDocument();
  });

  it('renders loading skeleton while fetching', () => {
    mockUseQuery.mockReturnValue([
      { fetching: true, error: undefined, data: undefined },
    ]);
    renderPage();
    // aria-busy grid is rendered instead of cards
    expect(screen.getByLabelText(/loading compliance courses/i)).toBeInTheDocument();
  });

  it('renders course cards when data loads (8 courses)', () => {
    mockUseQuery.mockReturnValue([
      {
        fetching: false,
        error: undefined,
        data: { complianceCourses: MOCK_COURSES },
      },
    ]);
    renderPage();
    // All 8 course titles should be in the document
    MOCK_COURSES.forEach((course) => {
      expect(screen.getByText(course.title)).toBeInTheDocument();
    });
    // 8 "Add to my org" buttons
    const buttons = screen.getAllByRole('button', { name: /add to my org/i });
    expect(buttons).toHaveLength(8);
  });

  it('renders error state when query fails', () => {
    mockUseQuery.mockReturnValue([
      {
        fetching: false,
        error: new Error('Network error'),
        data: undefined,
      },
    ]);
    renderPage();
    expect(
      screen.getByRole('alert')
    ).toHaveTextContent(/unable to load compliance library/i);
  });
});

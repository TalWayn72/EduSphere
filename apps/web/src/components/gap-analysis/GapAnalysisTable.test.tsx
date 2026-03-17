import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { GapAnalysisTable } from './GapAnalysisTable';

// ── Fixtures ──────────────────────────────────────────────────────────────────

interface GapItem {
  conceptName: string;
  isMastered: boolean;
  recommendedContentItems: string[];
  recommendedContentTitles: string[];
  relevanceScore: number;
}

const MOCK_GAPS: GapItem[] = [
  {
    conceptName: 'Neural Networks',
    isMastered: false,
    recommendedContentItems: ['content-1', 'content-2'],
    recommendedContentTitles: ['Intro to NN', 'Advanced NN'],
    relevanceScore: 0.92,
  },
  {
    conceptName: 'Linear Algebra',
    isMastered: false,
    recommendedContentItems: ['content-3'],
    recommendedContentTitles: ['Matrix Operations'],
    relevanceScore: 0.65,
  },
  {
    conceptName: 'Data Structures',
    isMastered: true,
    recommendedContentItems: [],
    recommendedContentTitles: [],
    relevanceScore: 0.3,
  },
];

const EMPTY_REC_GAP: GapItem = {
  conceptName: 'Calculus',
  isMastered: false,
  recommendedContentItems: [],
  recommendedContentTitles: [],
  relevanceScore: 0.75,
};

function renderTable(gaps: GapItem[] = MOCK_GAPS) {
  return render(<GapAnalysisTable gaps={gaps} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GapAnalysisTable', () => {
  it('shows empty state when no gaps provided', () => {
    renderTable([]);
    expect(
      screen.getByText('No knowledge gaps detected. All concepts mastered!'),
    ).toBeInTheDocument();
  });

  it('renders the "Knowledge Gaps" heading when gaps exist', () => {
    renderTable();
    expect(screen.getByText('Knowledge Gaps')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderTable();
    expect(screen.getByText('Concept')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Relevance')).toBeInTheDocument();
    expect(screen.getByText('Recommended Content')).toBeInTheDocument();
  });

  it('only renders rows for un-mastered gaps (filters out mastered)', () => {
    renderTable();
    const table = screen.getByTestId('critical-gaps-table');
    const rows = within(table).getAllByRole('row');
    // 1 header row + 2 un-mastered gap rows (mastered "Data Structures" is filtered)
    expect(rows).toHaveLength(3);
  });

  it('displays concept names for un-mastered items', () => {
    renderTable();
    expect(screen.getByText('Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
    // Mastered concept should not appear in a table row
    expect(screen.queryByText('Data Structures')).not.toBeInTheDocument();
  });

  it('renders relevance scores as percentages', () => {
    renderTable();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders "Gap" badge for un-mastered concepts', () => {
    renderTable();
    const gapBadges = screen.getAllByText('Gap');
    expect(gapBadges.length).toBe(2);
  });

  it('renders recommended content titles joined by comma', () => {
    renderTable();
    expect(screen.getByText('Intro to NN, Advanced NN')).toBeInTheDocument();
    expect(screen.getByText('Matrix Operations')).toBeInTheDocument();
  });

  it('shows "No recommendations available" when titles are empty', () => {
    renderTable([EMPTY_REC_GAP]);
    expect(screen.getByText('No recommendations available')).toBeInTheDocument();
  });

  it('has accessible table with aria-label', () => {
    renderTable();
    const table = screen.getByRole('table', { name: /knowledge gap analysis/i });
    expect(table).toBeInTheDocument();
  });

  it('uses scope="col" on header cells for accessibility', () => {
    renderTable();
    const headers = screen.getAllByRole('columnheader');
    headers.forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col');
    });
  });

  it('does not display raw i18n keys', () => {
    renderTable();
    const html = document.body.innerHTML;
    expect(html).not.toContain('{{');
  });
});

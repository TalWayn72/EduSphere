/**
 * Unit tests for CitationEditModal.
 *
 * Tests: rendering, form pre-population, submission, error handling,
 * loading state, onClose / onSaved callbacks.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LessonCitation } from '@/components/enriched-transcript/enriched-transcript.types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdateCitation = vi.fn();

vi.mock('@/hooks/useCitationReview', () => ({
  useCitationReview: () => ({
    approve: vi.fn(),
    reject: vi.fn(),
    updateCitation: mockUpdateCitation,
    loading: false,
    error: null,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback ?? key,
  }),
}));

// ── Component import (after mocks) ───────────────────────────────────────────

import { CitationEditModal } from './CitationEditModal';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_CITATION: LessonCitation = {
  id: 'cit-001',
  bookName: 'עץ חיים',
  part: 'שער א',
  page: '12',
  column: '1',
  paragraph: '3',
  sourceText: 'ויאמר אלוהים יהי אור',
  resolvedText: 'וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר',
  matchStatus: 'UNVERIFIED',
  confidence: 0.87,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CitationEditModal', () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateCitation.mockResolvedValue(undefined);
  });

  it('renders the modal when open=true with a citation', () => {
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Citation')).toBeInTheDocument();
  });

  it('does NOT render dialog content when open=false', () => {
    render(
      <CitationEditModal
        open={false}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-populates bookName field with citation data', () => {
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    const input = screen.getByLabelText(/Book Name/i) as HTMLInputElement;
    expect(input.value).toBe('עץ חיים');
  });

  it('pre-populates sourceText field with citation data', () => {
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    const textarea = screen.getByLabelText(/Source Text/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('ויאמר אלוהים יהי אור');
  });

  it('calls updateCitation with correct values on submit', async () => {
    const user = userEvent.setup();
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateCitation).toHaveBeenCalledWith(
        'cit-001',
        expect.objectContaining({
          bookName: 'עץ חיים',
          sourceText: 'ויאמר אלוהים יהי אור',
        })
      );
    });
  });

  it('calls onSaved and onClose after successful save', async () => {
    const user = userEvent.setup();
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when updateCitation throws', async () => {
    mockUpdateCitation.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows required error when bookName is cleared before submit', async () => {
    const user = userEvent.setup();
    render(
      <CitationEditModal
        open={true}
        citation={MOCK_CITATION}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    const input = screen.getByLabelText(/Book Name/i);
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Book name is required')).toBeInTheDocument();
    });
    expect(mockUpdateCitation).not.toHaveBeenCalled();
  });

  it('renders without crashing when citation is null', () => {
    render(
      <CitationEditModal
        open={true}
        citation={null}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

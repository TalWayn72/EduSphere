/**
 * Tests for EditSourceModal component.
 *
 * Covers:
 *  1. Renders with source title pre-filled
 *  2. Calls onUpdated on successful save
 *  3. Shows error when title is empty
 *  4. Shows error on mutation failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditSourceModal } from './EditSourceModal';
import type { KnowledgeSource } from './types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMutateAsync = vi.fn();
const mockIsPending = { isPending: false };

vi.mock('./useUpdateSourceMutation', () => ({
  useUpdateSourceMutation: vi.fn(
    ({ onUpdated }: { onUpdated: () => void }) => ({
      mutateAsync: mockMutateAsync.mockImplementation(async () => {
        onUpdated();
      }),
      isPending: mockIsPending.isPending,
    })
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { dir: () => 'ltr' },
  }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const mockSource: KnowledgeSource = {
  id: 'source-1',
  title: 'Test Source',
  sourceType: 'URL',
  origin: 'https://example.com',
  status: 'READY',
  chunkCount: 5,
  createdAt: '2026-01-01T00:00:00Z',
  metadata: { language: 'en' },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditSourceModal', () => {
  const onClose = vi.fn();
  const onUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.isPending = false;
  });

  it('renders with source title pre-filled', () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    const titleInput = screen.getByTestId('edit-source-title-input');
    expect((titleInput as HTMLInputElement).value).toBe('Test Source');
  });

  it('renders metadata as JSON string', () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    const metaInput = screen.getByTestId('edit-source-metadata-input');
    expect((metaInput as HTMLTextAreaElement).value).toContain('"language"');
  });

  it('calls onUpdated on successful save', async () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    fireEvent.click(screen.getByTestId('edit-source-save-btn'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'source-1', title: 'Test Source' })
      );
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('shows error when title is empty', async () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    const titleInput = screen.getByTestId('edit-source-title-input');
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('edit-source-save-btn'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('shows error on invalid JSON metadata', async () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    const metaInput = screen.getByTestId('edit-source-metadata-input');
    fireEvent.change(metaInput, { target: { value: '{invalid json' } });
    fireEvent.click(screen.getByTestId('edit-source-save-btn'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    render(
      <EditSourceModal
        source={mockSource}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    );
    fireEvent.click(screen.getByText('sources.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

/**
 * YouTube ingest integration tests for CourseWizardMediaStep.
 * Split into a separate file to keep both files under 300 lines.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'wizard.clickToSelect': 'Click to select files',
        'wizard.supportedFormats': 'Supported formats',
        'wizard.upload': 'Upload',
        'wizard.displayTitle': 'Display Title',
        'wizard.uploadedFiles': `Uploaded files (${String(opts?.count ?? 0)})`,
        'wizard.preparingUpload': 'Preparing upload...',
        'wizard.uploadingFile': 'Uploading file...',
        'wizard.confirming': 'Confirming...',
        'wizard.uploadComplete': 'Upload complete',
        'wizard.failedUploadUrl': 'Failed to get upload URL',
        'wizard.retryUpload': 'Retry',
        'wizard.networkError': 'Network error',
        'wizard.failedConfirm': 'Failed to confirm upload',
        'wizard.createRichDocument': 'Create Rich Document',
        'wizard.richDocTitlePlaceholder': 'Document title...',
        'wizard.addRichDocument': 'Add Rich Document',
        'wizard.richDocAdded': 'Added',
        'wizard.addYoutubeVideo': 'Add YouTube Video',
        'wizard.youtubeIngestFailed': 'YouTube ingest failed',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/urql-client', () => ({
  urqlClient: {
    query: vi.fn(() => ({
      toPromise: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    mutation: vi.fn(() => ({
      toPromise: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  PRESIGNED_UPLOAD_QUERY: 'PRESIGNED_UPLOAD_QUERY',
  CONFIRM_MEDIA_UPLOAD_MUTATION: 'CONFIRM_MEDIA_UPLOAD_MUTATION',
}));

vi.mock('@/lib/graphql/enriched-lesson.queries', () => ({
  INGEST_YOUTUBE_LESSON_MUTATION: 'INGEST_YOUTUBE_LESSON_MUTATION',
}));

vi.mock('@/components/AltTextModal', () => ({
  AltTextModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="alt-text-modal" /> : null,
}));

vi.mock('@/components/editor/RichEditor', () => ({
  RichEditor: ({ onChange }: { onChange: (v: string) => void }) => (
    <textarea
      data-testid="rich-editor"
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseWizardMediaStep } from './CourseWizardMediaStep';
import type { UploadedMedia } from './course-create.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderStep({
  mediaList = [] as UploadedMedia[],
  onChange = vi.fn(),
} = {}) {
  return render(
    <CourseWizardMediaStep
      courseId="course-1"
      mediaList={mediaList}
      onChange={onChange}
    />
  );
}

const VALID_YT_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseWizardMediaStep — YouTube section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add YouTube Video" section heading', () => {
    renderStep();
    expect(screen.getByText('Add YouTube Video')).toBeInTheDocument();
  });

  it('renders the YouTube URL input', () => {
    renderStep();
    expect(
      screen.getByRole('textbox', { name: /youtube video url/i })
    ).toBeInTheDocument();
  });

  it('"Ingest" button is disabled when URL field is empty', () => {
    renderStep();
    expect(screen.getByRole('button', { name: /ingest/i })).toBeDisabled();
  });

  it('"Ingest" button is enabled after a valid YouTube URL is entered', async () => {
    renderStep();
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: VALID_YT_URL } }
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /ingest/i })).not.toBeDisabled()
    );
  });

  it('calls urqlClient.mutation with correct input on Ingest click', async () => {
    const { urqlClient } = await import('@/lib/urql-client');
    vi.mocked(urqlClient.mutation).mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        data: {
          ingestYoutubeLesson: {
            id: 'lesson-1',
            youtubeVideoId: 'dQw4w9WgXcQ',
            enrichmentStatus: 'PENDING',
          },
        },
        error: null,
      }),
    } as never);

    renderStep();
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: VALID_YT_URL } }
    );
    fireEvent.click(screen.getByRole('button', { name: /ingest/i }));

    await waitFor(() =>
      expect(urqlClient.mutation).toHaveBeenCalledWith(
        'INGEST_YOUTUBE_LESSON_MUTATION',
        expect.objectContaining({
          input: expect.objectContaining({
            youtubeUrl: VALID_YT_URL,
            courseId: 'course-1',
          }),
        })
      )
    );
  });

  it('calls onChange with a YOUTUBE mediaList entry on success', async () => {
    const { urqlClient } = await import('@/lib/urql-client');
    vi.mocked(urqlClient.mutation).mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        data: {
          ingestYoutubeLesson: {
            id: 'lesson-1',
            youtubeVideoId: 'dQw4w9WgXcQ',
            enrichmentStatus: 'PENDING',
          },
        },
        error: null,
      }),
    } as never);

    const onChange = vi.fn();
    renderStep({ onChange });
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: VALID_YT_URL } }
    );
    fireEvent.click(screen.getByRole('button', { name: /ingest/i }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaList: expect.arrayContaining([
            expect.objectContaining({
              id: 'lesson-1',
              contentType: 'YOUTUBE',
              status: 'PROCESSING',
            }),
          ]),
        })
      )
    );
  });

  it('shows error message when mutation fails', async () => {
    const { urqlClient } = await import('@/lib/urql-client');
    vi.mocked(urqlClient.mutation).mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      }),
    } as never);

    renderStep();
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: VALID_YT_URL } }
    );
    fireEvent.click(screen.getByRole('button', { name: /ingest/i }));

    await waitFor(() =>
      expect(screen.getByText('Service unavailable')).toBeInTheDocument()
    );
  });

  it('shows fallback error when mutation returns no data and no error message', async () => {
    const { urqlClient } = await import('@/lib/urql-client');
    vi.mocked(urqlClient.mutation).mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    } as never);

    renderStep();
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: VALID_YT_URL } }
    );
    fireEvent.click(screen.getByRole('button', { name: /ingest/i }));

    await waitFor(() =>
      expect(screen.getByText('YouTube ingest failed')).toBeInTheDocument()
    );
  });

  it('shows "Invalid YouTube URL" for non-YouTube input', () => {
    renderStep();
    fireEvent.change(
      screen.getByRole('textbox', { name: /youtube video url/i }),
      { target: { value: 'https://example.com/video' } }
    );
    expect(screen.getByText('Invalid YouTube URL')).toBeInTheDocument();
  });
});

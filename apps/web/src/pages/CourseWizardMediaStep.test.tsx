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
        'wizard.networkError': 'Network error',
        'wizard.failedConfirm': 'Failed to confirm upload',
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UPLOADED_MEDIA: UploadedMedia[] = [
  {
    id: 'm1',
    courseId: 'course-1',
    fileKey: 'key1',
    title: 'Intro Video',
    contentType: 'VIDEO',
    status: 'READY',
    downloadUrl: null,
    altText: null,
  },
];

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseWizardMediaStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the file drop zone with "Click to select files" text', () => {
    renderStep();
    expect(screen.getByText('Click to select files')).toBeInTheDocument();
  });

  it('renders the hidden file input', () => {
    const { container } = renderStep();
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('multiple');
  });

  it('renders the "Create Rich Document" section', () => {
    renderStep();
    expect(screen.getByText('Create Rich Document')).toBeInTheDocument();
  });

  it('renders RichEditor in the rich document section', () => {
    renderStep();
    expect(screen.getByTestId('rich-editor')).toBeInTheDocument();
  });

  it('"Add Rich Document" button is disabled when title is empty', () => {
    renderStep();
    expect(
      screen.getByRole('button', { name: /add rich document/i })
    ).toBeDisabled();
  });

  it('"Add Rich Document" button is enabled when title is filled', () => {
    renderStep();
    fireEvent.change(screen.getByPlaceholderText('Document title...'), {
      target: { value: 'My Guide' },
    });
    expect(
      screen.getByRole('button', { name: /add rich document/i })
    ).not.toBeDisabled();
  });

  it('shows "Added" feedback and calls onChange after adding a rich document', async () => {
    const onChange = vi.fn();
    renderStep({ onChange });

    fireEvent.change(screen.getByPlaceholderText('Document title...'), {
      target: { value: 'Study Guide' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add rich document/i }));

    await waitFor(() => expect(screen.getByText('Added')).toBeInTheDocument());
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaList: expect.arrayContaining([
          expect.objectContaining({
            title: 'Study Guide',
            contentType: 'RICH_DOCUMENT',
          }),
        ]),
      })
    );
  });

  it('renders existing uploaded media list', () => {
    renderStep({ mediaList: UPLOADED_MEDIA });
    expect(screen.getByText('Intro Video')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
  });

  it('shows uploaded file count in heading', () => {
    renderStep({ mediaList: UPLOADED_MEDIA });
    expect(screen.getByText('Uploaded files (1)')).toBeInTheDocument();
  });

  it('adds file entry when a file is selected via the input', () => {
    const { container } = renderStep();
    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['video content'], 'lecture.mp4', {
      type: 'video/mp4',
    });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    fireEvent.change(fileInput);
    expect(screen.getByText('lecture.mp4')).toBeInTheDocument();
  });
});

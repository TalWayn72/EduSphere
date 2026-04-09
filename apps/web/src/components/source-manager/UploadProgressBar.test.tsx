/**
 * Tests for UploadProgressBar component.
 *
 * Covers:
 *  1. Hidden when neither isReading nor isUploading
 *  2. Shows read progress during isReading phase
 *  3. Shows upload progress during isUploading phase
 *  4. Shows file size bytes info during isUploading when fileSize provided
 *  5. Progress bar has correct aria attributes
 *  6. Percentage displayed correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UploadProgressBar } from './UploadProgressBar';

// i18n stub
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'sources.readingFile')
        return `Reading… ${params?.progress ?? 0}%`;
      if (key === 'sources.uploadingFile')
        return `Uploading… ${params?.progress ?? 0}%`;
      return key;
    },
  }),
}));

const defaultProps = {
  isReading: false,
  readProgress: 0,
  isUploading: false,
  uploadProgress: 0,
};

describe('UploadProgressBar', () => {
  it('renders nothing when neither isReading nor isUploading', () => {
    const { container } = render(<UploadProgressBar {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the progress container when isReading is true', () => {
    render(<UploadProgressBar {...defaultProps} isReading readProgress={40} />);
    expect(screen.getByTestId('upload-progress-bar')).toBeInTheDocument();
  });

  it('renders the progress container when isUploading is true', () => {
    render(
      <UploadProgressBar {...defaultProps} isUploading uploadProgress={60} />
    );
    expect(screen.getByTestId('upload-progress-bar')).toBeInTheDocument();
  });

  it('displays read progress percentage correctly', () => {
    render(<UploadProgressBar {...defaultProps} isReading readProgress={55} />);
    expect(screen.getByTestId('upload-progress-pct').textContent).toBe('55%');
  });

  it('displays upload progress percentage correctly', () => {
    render(
      <UploadProgressBar {...defaultProps} isUploading uploadProgress={72} />
    );
    expect(screen.getByTestId('upload-progress-pct').textContent).toBe('72%');
  });

  it('shows "Reading" label during read phase', () => {
    render(<UploadProgressBar {...defaultProps} isReading readProgress={30} />);
    expect(screen.getByTestId('upload-progress-label').textContent).toMatch(
      /Reading/i
    );
  });

  it('shows "Uploading" label during upload phase', () => {
    render(
      <UploadProgressBar {...defaultProps} isUploading uploadProgress={50} />
    );
    expect(screen.getByTestId('upload-progress-label').textContent).toMatch(
      /Uploading/i
    );
  });

  it('shows byte size info during upload when fileSize is provided', () => {
    render(
      <UploadProgressBar
        {...defaultProps}
        isUploading
        uploadProgress={50}
        fileSize={2 * 1024 * 1024} // 2 MB
      />
    );
    const bytesEl = screen.getByTestId('upload-progress-bytes');
    // 50% of 2 MB = 1 MB transferred
    expect(bytesEl.textContent).toContain('1.0 MB');
    expect(bytesEl.textContent).toContain('2.0 MB');
  });

  it('does not show byte size info during read phase', () => {
    render(
      <UploadProgressBar
        {...defaultProps}
        isReading
        readProgress={50}
        fileSize={1024}
      />
    );
    expect(screen.queryByTestId('upload-progress-bytes')).toBeNull();
  });

  it('does not show byte size info when fileSize is not provided', () => {
    render(
      <UploadProgressBar {...defaultProps} isUploading uploadProgress={50} />
    );
    expect(screen.queryByTestId('upload-progress-bytes')).toBeNull();
  });

  it('progress bar has correct aria-valuenow', () => {
    render(
      <UploadProgressBar {...defaultProps} isUploading uploadProgress={77} />
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '77');
  });

  it('container has role="status" and aria-live="polite"', () => {
    render(<UploadProgressBar {...defaultProps} isReading readProgress={10} />);
    const container = screen.getByTestId('upload-progress-bar');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('formats bytes correctly for small files (KB)', () => {
    render(
      <UploadProgressBar
        {...defaultProps}
        isUploading
        uploadProgress={100}
        fileSize={512 * 1024} // 512 KB
      />
    );
    const bytesEl = screen.getByTestId('upload-progress-bytes');
    expect(bytesEl.textContent).toContain('512.0 KB');
  });

  it('formats bytes correctly for 0 bytes', () => {
    render(
      <UploadProgressBar
        {...defaultProps}
        isUploading
        uploadProgress={0}
        fileSize={1024}
      />
    );
    const bytesEl = screen.getByTestId('upload-progress-bytes');
    expect(bytesEl.textContent).toContain('0 B');
  });
});

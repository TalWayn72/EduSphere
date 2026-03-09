import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FolderUploadZone } from './FolderUploadZone';

// Mock navigator.userAgent to non-iOS
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
  configurable: true,
});

describe('FolderUploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone with accessible label', () => {
    render(<FolderUploadZone courseId="course-1" />);
    expect(
      screen.getByRole('button', { name: /upload folder or zip archive/i })
    ).toBeInTheDocument();
  });

  it('renders "Drop a folder or ZIP here" text', () => {
    render(<FolderUploadZone courseId="course-1" />);
    expect(screen.getByText(/drop a folder or zip here/i)).toBeInTheDocument();
  });

  it('calls onFilesSelected with sorted valid files', () => {
    const onFilesSelected = vi.fn();
    render(<FolderUploadZone courseId="course-1" onFilesSelected={onFilesSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFiles = [
      Object.assign(new File([''], '02_lesson.mp4', { type: 'video/mp4' }), { webkitRelativePath: 'course/02_lesson.mp4' }),
      Object.assign(new File([''], '01_intro.pdf', { type: 'application/pdf' }), { webkitRelativePath: 'course/01_intro.pdf' }),
    ];

    Object.defineProperty(input, 'files', {
      value: { length: mockFiles.length, ...mockFiles, [Symbol.iterator]: [][Symbol.iterator] },
      configurable: true,
    });
    fireEvent.change(input);

    // Should have been called with files
    expect(onFilesSelected).toHaveBeenCalled();
    const calledWith: Array<{ relativePath: string }> = onFilesSelected.mock.calls[0][0];
    // Sorted: 01_ before 02_
    expect(calledWith[0].relativePath).toContain('01_');
    expect(calledWith[1].relativePath).toContain('02_');
  });

  it('filters out unsupported file types (e.g. .exe)', () => {
    const onFilesSelected = vi.fn();
    render(<FolderUploadZone courseId="course-1" onFilesSelected={onFilesSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFiles = [
      Object.assign(new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' }), { webkitRelativePath: 'virus.exe' }),
      Object.assign(new File([''], 'lesson.mp4', { type: 'video/mp4' }), { webkitRelativePath: 'lesson.mp4' }),
    ];

    Object.defineProperty(input, 'files', {
      value: { length: mockFiles.length, ...mockFiles, [Symbol.iterator]: [][Symbol.iterator] },
      configurable: true,
    });
    fireEvent.change(input);

    expect(onFilesSelected).toHaveBeenCalled();
    const calledWith: Array<{ relativePath: string }> = onFilesSelected.mock.calls[0][0];
    // Only lesson.mp4 should be passed (exe filtered out)
    expect(calledWith).toHaveLength(1);
    expect(calledWith[0].relativePath).toBe('lesson.mp4');
  });

  it('shows size warning for files over 500MB', () => {
    const onFilesSelected = vi.fn();
    render(<FolderUploadZone courseId="course-1" onFilesSelected={onFilesSelected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = Object.assign(
      new File([''], 'big.mp4', { type: 'video/mp4' }),
      { webkitRelativePath: 'big.mp4' }
    );
    Object.defineProperty(bigFile, 'size', { value: 600 * 1024 * 1024 });

    Object.defineProperty(input, 'files', {
      value: { length: 1, 0: bigFile, [Symbol.iterator]: [][Symbol.iterator] },
      configurable: true,
    });
    fireEvent.change(input);

    expect(screen.getByRole('status')).toHaveTextContent(/large uploads/i);
  });

  it('shows selected file list after files are chosen', () => {
    render(<FolderUploadZone courseId="course-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const mockFiles = [
      Object.assign(new File([''], 'intro.pdf', { type: 'application/pdf' }), { webkitRelativePath: 'course/intro.pdf' }),
    ];

    Object.defineProperty(input, 'files', {
      value: { length: 1, 0: mockFiles[0], [Symbol.iterator]: [][Symbol.iterator] },
      configurable: true,
    });
    fireEvent.change(input);

    expect(screen.getByText('1 file(s) selected:')).toBeInTheDocument();
    expect(screen.getByText('course/intro.pdf')).toBeInTheDocument();
  });
});

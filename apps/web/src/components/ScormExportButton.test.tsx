import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { ScormExportButton } from './ScormExportButton';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/scorm.queries', () => ({
  EXPORT_COURSE_AS_SCORM_MUTATION: 'EXPORT_COURSE_AS_SCORM_MUTATION',
}));

const mockExportScorm = vi.fn();

const defaultProps = {
  courseId: 'c-1',
  courseTitle: 'Introduction to React',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useMutation).mockReturnValue([
    {} as never,
    mockExportScorm as never,
  ]);
  mockExportScorm.mockResolvedValue({
    data: { exportCourseAsScorm: 'https://minio.example.com/scorm.zip' },
    error: undefined,
  });
  // Mock window.open
  vi.stubGlobal('open', vi.fn());
});

describe('ScormExportButton', () => {
  it('renders the export button with correct aria-label', () => {
    render(<ScormExportButton {...defaultProps} />);
    expect(
      screen.getByRole('button', {
        name: /export introduction to react as scorm 2004/i,
      })
    ).toBeInTheDocument();
  });

  it('shows "Export as SCORM 2004" button text initially', () => {
    render(<ScormExportButton {...defaultProps} />);
    expect(screen.getByText('Export as SCORM 2004')).toBeInTheDocument();
  });

  it('calls mutation with courseId on button click', async () => {
    render(<ScormExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() =>
      expect(mockExportScorm).toHaveBeenCalledWith({ courseId: 'c-1' })
    );
  });

  it('opens presigned URL in a new tab on success', async () => {
    render(<ScormExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://minio.example.com/scorm.zip',
        '_blank',
        'noopener,noreferrer'
      )
    );
  });

  it('shows error message when mutation returns an error', async () => {
    mockExportScorm.mockResolvedValue({
      data: undefined,
      error: { message: 'Export failed' },
    });
    render(<ScormExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() =>
      expect(screen.getByText('Export failed')).toBeInTheDocument()
    );
  });

  it('does not open window when presigned URL is absent', async () => {
    mockExportScorm.mockResolvedValue({
      data: { exportCourseAsScorm: undefined },
      error: undefined,
    });
    render(<ScormExportButton {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => expect(mockExportScorm).toHaveBeenCalled());
    expect(window.open).not.toHaveBeenCalled();
  });

  it('button is disabled while exporting', async () => {
    // Make export never resolve so the component stays in exporting state
    mockExportScorm.mockReturnValue(new Promise(() => {}));
    render(<ScormExportButton {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
  });
});

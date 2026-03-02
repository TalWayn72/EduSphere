import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// urql sync mock
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { ScormImportDialog } from './ScormImportDialog';
import * as urql from 'urql';

const NOOP_IMPORT = vi.fn().mockResolvedValue({ data: null, error: undefined });

const defaultPresigned = vi.fn().mockResolvedValue({
  uploadUrl: 'https://minio.example.com/upload',
  fileKey: 'scorm/package.zip',
});

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ScormImportDialog>> = {}
) {
  return render(
    <ScormImportDialog
      open={true}
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      presignedUploadUrl={defaultPresigned}
      {...overrides}
    />
  );
}

describe('ScormImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
        stale: false,
        operation: undefined,
      },
      NOOP_IMPORT,
    ] as unknown as ReturnType<typeof urql.useMutation>);
  });

  it('renders dialog title', () => {
    renderDialog();
    expect(screen.getByText('Import SCORM Package')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderDialog();
    expect(
      screen.getByText(/SCORM 1\.2 or 2004 ZIP package/i)
    ).toBeInTheDocument();
  });

  it('renders the file drop zone with upload instruction', () => {
    renderDialog();
    expect(
      screen.getByText(/Click to select a \.zip SCORM package/i)
    ).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Import SCORM Package')).not.toBeInTheDocument();
  });

  it('shows error state when a non-zip file is selected', async () => {
    renderDialog();
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Please select a \.zip file/i)
      ).toBeInTheDocument();
    });
  });

  it('shows Try again button in error state', async () => {
    renderDialog();
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument();
    });
  });

  it('shows upload state and calls presignedUploadUrl for zip file', async () => {
    // Mock XHR
    const xhrMock = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
      upload: { onprogress: null as unknown },
      onload: null as unknown,
      onerror: null as unknown,
      status: 200,
    };
    vi.spyOn(window, 'XMLHttpRequest').mockImplementation(
      () => xhrMock as unknown as XMLHttpRequest
    );

    renderDialog();
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['content'], 'course.zip', {
      type: 'application/zip',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultPresigned).toHaveBeenCalledWith('course.zip');
    });
  });

  it('shows "Import SCORM Package" title when open', () => {
    renderDialog();
    // Verify the dialog title is present and dialog is visible
    expect(screen.getAllByText('Import SCORM Package').length).toBeGreaterThan(
      0
    );
  });
});

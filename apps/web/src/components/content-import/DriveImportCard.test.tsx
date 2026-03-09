import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, 'data-testid': testId, className: _cls, variant: _v }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'data-testid'?: string;
    className?: string;
    variant?: string;
  }) =>
    React.createElement('button', { onClick, disabled, 'data-testid': testId }, children),
}));
vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, disabled, 'data-testid': testId, placeholder, id }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    'data-testid'?: string;
    placeholder?: string;
    id?: string;
  }) =>
    React.createElement('input', { value, onChange, disabled, 'data-testid': testId, placeholder, id }),
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) =>
    React.createElement('label', { htmlFor }, children),
}));

import { DriveImportCard } from './DriveImportCard';

describe('DriveImportCard', () => {
  const defaultProps = {
    courseId: 'course-1',
    moduleId: 'module-1',
    onImport: vi.fn(),
    isImporting: false,
  };

  it('renders "Connect Google Drive" button initially', () => {
    render(React.createElement(DriveImportCard, defaultProps));
    expect(screen.getByTestId('connect-drive-btn')).toBeDefined();
  });

  it('shows connected message after clicking connect', () => {
    render(React.createElement(DriveImportCard, defaultProps));
    fireEvent.click(screen.getByTestId('connect-drive-btn'));
    expect(screen.getByTestId('drive-connected-msg')).toBeDefined();
  });

  it('import button is disabled when folder ID is empty', () => {
    render(React.createElement(DriveImportCard, defaultProps));
    fireEvent.click(screen.getByTestId('connect-drive-btn')); // connect
    const importBtn = screen.getByTestId('drive-import-btn') as HTMLButtonElement;
    expect(importBtn.disabled).toBe(true);
  });

  it('calls onImport with folderId when import button clicked', () => {
    const onImport = vi.fn();
    render(React.createElement(DriveImportCard, { ...defaultProps, onImport }));
    fireEvent.click(screen.getByTestId('connect-drive-btn'));
    fireEvent.change(screen.getByTestId('drive-folder-input'), {
      target: { value: 'my-folder-id' },
    });
    fireEvent.click(screen.getByTestId('drive-import-btn'));
    expect(onImport).toHaveBeenCalledWith('my-folder-id', 'mock-access-token');
  });

  it('extracts folder ID from a full Drive URL', () => {
    const onImport = vi.fn();
    render(React.createElement(DriveImportCard, { ...defaultProps, onImport }));
    fireEvent.click(screen.getByTestId('connect-drive-btn'));
    fireEvent.change(screen.getByTestId('drive-folder-input'), {
      target: { value: 'https://drive.google.com/drive/folders/abc123XYZ' },
    });
    fireEvent.click(screen.getByTestId('drive-import-btn'));
    expect(onImport).toHaveBeenCalledWith('abc123XYZ', 'mock-access-token');
  });

  it('shows "Importing..." text when isImporting is true', () => {
    render(React.createElement(DriveImportCard, { ...defaultProps, isImporting: true }));
    fireEvent.click(screen.getByTestId('connect-drive-btn'));
    expect(screen.getByTestId('drive-import-btn').textContent).toBe('Importing...');
  });
});

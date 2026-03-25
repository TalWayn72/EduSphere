import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>MARKDOWN</span>,
}));

import { AddContentItemForm } from './AddContentItemForm';

describe('AddContentItemForm', () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onCancel = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders add content item label', () => {
    render(<AddContentItemForm moduleId="m-1" onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText('addContentItem')).toBeInTheDocument();
  });

  it('renders title input', () => {
    render(<AddContentItemForm moduleId="m-1" onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByPlaceholderText('contentItemTitle')).toBeInTheDocument();
  });

  it('renders add button disabled when title empty', () => {
    render(<AddContentItemForm moduleId="m-1" onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText('add')).toBeDisabled();
  });

  it('enables add button when title has content', () => {
    render(<AddContentItemForm moduleId="m-1" onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByPlaceholderText('contentItemTitle'), { target: { value: 'New Item' } });
    expect(screen.getByText('add')).not.toBeDisabled();
  });

  it('calls onCancel when cancel clicked', () => {
    render(<AddContentItemForm moduleId="m-1" onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

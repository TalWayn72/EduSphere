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
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AddModuleForm } from './AddModuleForm';

describe('AddModuleForm', () => {
  const onSubmit = vi.fn().mockResolvedValue(true);

  beforeEach(() => vi.clearAllMocks());

  it('renders add module button initially', () => {
    render(<AddModuleForm onSubmit={onSubmit} />);
    expect(screen.getByText('addModule')).toBeInTheDocument();
  });

  it('shows form when add module button clicked', () => {
    render(<AddModuleForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('addModule'));
    expect(screen.getByText('newModule')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('moduleTitlePlaceholder')).toBeInTheDocument();
  });

  it('create button disabled when title empty', () => {
    render(<AddModuleForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('addModule'));
    expect(screen.getByText('createModule')).toBeDisabled();
  });

  it('enables create button when title entered', () => {
    render(<AddModuleForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('addModule'));
    fireEvent.change(screen.getByPlaceholderText('moduleTitlePlaceholder'), { target: { value: 'Module 1' } });
    expect(screen.getByText('createModule')).not.toBeDisabled();
  });

  it('hides form when cancel clicked', () => {
    render(<AddModuleForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('addModule'));
    fireEvent.click(screen.getByText('cancel'));
    expect(screen.getByText('addModule')).toBeInTheDocument();
    expect(screen.queryByText('newModule')).not.toBeInTheDocument();
  });
});

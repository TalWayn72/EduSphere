import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => <h3 onClick={onClick}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  ChevronUp: () => <span>up</span>,
  ChevronDown: () => <span>down</span>,
  Trash2: () => <span>trash</span>,
  Plus: () => <span>plus</span>,
  Loader2: () => <span>loader</span>,
  Pencil: () => <span>pencil</span>,
  Check: () => <span>check</span>,
  X: () => <span>x</span>,
  ChevronRight: () => <span>chevron</span>,
}));

vi.mock('./ContentItemList', () => ({
  ContentItemList: () => <div data-testid="content-item-list" />,
}));

vi.mock('./AddContentItemForm', () => ({
  AddContentItemForm: () => <div data-testid="add-content-form" />,
}));

import { ModuleCard } from './ModuleCard';

const mod = {
  id: 'm-1',
  title: 'Module A',
  orderIndex: 0,
  contentItems: [
    {
      id: 'ci-1',
      title: 'Item 1',
      contentType: 'VIDEO',
      duration: 300,
      orderIndex: 0,
    },
  ],
};

describe('ModuleCard', () => {
  const baseProps = {
    mod,
    index: 0,
    totalModules: 2,
    isLoading: false,
    onReorder: vi.fn(),
    onDelete: vi.fn(),
    onSaveTitle: vi.fn(),
    onAddContentItem: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders module title', () => {
    render(<ModuleCard {...baseProps} />);
    expect(screen.getByText('Module A')).toBeInTheDocument();
  });

  it('renders content item list when expanded', () => {
    render(<ModuleCard {...baseProps} />);
    // Click the CardTitle to expand
    fireEvent.click(screen.getByText('Module A'));
    expect(screen.getByTestId('content-item-list')).toBeInTheDocument();
  });

  it('renders without crash when isLoading', () => {
    const { container } = render(
      <ModuleCard {...baseProps} isLoading={true} />
    );
    expect(container).toBeTruthy();
  });
});

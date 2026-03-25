import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ courseId: 'c-1' }), useNavigate: () => vi.fn(), Navigate: ({ to }: { to: string }) => <div>redirect {to}</div> };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useExamApi', () => ({
  useExamItemBank: vi.fn(() => ({ items: [], totalCount: 0, fetching: false, error: null })),
  useRetireExamItem: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => 'INSTRUCTOR',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: () => <h1>header</h1>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/exam/ItemBankTable', () => ({
  ItemBankTable: () => <div data-testid="item-bank-table" />,
}));

vi.mock('@/components/exam/ItemBankFilters', () => ({
  ItemBankFilters: () => <div data-testid="item-bank-filters" />,
}));

import { ExamItemBankPage } from './ExamItemBankPage';

describe('ExamItemBankPage', () => {
  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><ExamItemBankPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

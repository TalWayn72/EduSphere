import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ courseId: 'c-1' }), useNavigate: () => vi.fn(), Navigate: ({ to }: { to: string }) => <div>redirect {to}</div> };
});

vi.mock('@/hooks/useExamApi', () => ({
  useExamBlueprints: vi.fn(() => ({ blueprints: [], fetching: false, error: null })),
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { ExamBlueprintListPage } from './ExamBlueprintListPage';

describe('ExamBlueprintListPage', () => {
  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><ExamBlueprintListPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

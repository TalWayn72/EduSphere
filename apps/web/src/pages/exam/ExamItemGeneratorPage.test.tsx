import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ courseId: 'c-1' }),
    Navigate: ({ to }: { to: string }) => <div>redirect {to}</div>,
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => 'INSTRUCTOR',
}));

vi.mock('@/hooks/useExamApi', () => ({
  useGenerateExamItems: vi.fn(() => ({ generate: vi.fn(), loading: false })),
  useCreateExamItem: vi.fn(() => ({ create: vi.fn(), loading: false })),
  useCourseModules: vi.fn(() => ({ data: [], loading: false })),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: () => <h1>header</h1>,
}));

vi.mock('@/components/exam/ExamItemReviewCard', () => ({
  ExamItemReviewCard: () => <div data-testid="review-card" />,
}));

vi.mock('./GeneratorForm', () => ({
  GeneratorForm: () => <div data-testid="generator-form" />,
}));

import { ExamItemGeneratorPage } from './ExamItemGeneratorPage';

describe('ExamItemGeneratorPage', () => {
  it('renders without crash', () => {
    const { container } = render(
      <MemoryRouter>
        <ExamItemGeneratorPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});

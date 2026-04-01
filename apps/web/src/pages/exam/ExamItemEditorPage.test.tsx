import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ courseId: 'c-1', itemId: 'item-1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form');
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn(() => ({})),
      handleSubmit: vi.fn((cb: () => void) => (e: Event) => {
        e?.preventDefault?.();
        cb();
      }),
      watch: vi.fn(),
      formState: { errors: {}, isValid: true },
      control: {},
      reset: vi.fn(),
      setValue: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/useExamApi', () => ({
  useExamItem: vi.fn(() => ({ data: null, loading: false })),
  useCreateExamItem: vi.fn(() => ({ create: vi.fn(), loading: false })),
  useUpdateExamItem: vi.fn(() => ({ update: vi.fn(), loading: false })),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => ({ role: 'INSTRUCTOR' }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('./ExamItemFormFields', () => ({
  ExamItemFormFields: () => <div data-testid="form-fields" />,
}));

import { ExamItemEditorPage } from './ExamItemEditorPage';

describe('ExamItemEditorPage', () => {
  it('renders without crash', () => {
    const { container } = render(
      <MemoryRouter>
        <ExamItemEditorPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});

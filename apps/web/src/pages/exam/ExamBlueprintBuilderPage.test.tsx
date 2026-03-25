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
    useParams: () => ({ courseId: 'c-1' }),
    useNavigate: () => vi.fn(),
    Navigate: () => null,
  };
});

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form');
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn(() => ({})),
      handleSubmit: vi.fn((cb: () => void) => (e: Event) => { e?.preventDefault?.(); cb(); }),
      watch: vi.fn(),
      formState: { errors: {}, isValid: true },
      control: {},
      reset: vi.fn(),
    }),
  };
});

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => ({ role: 'INSTRUCTOR' }),
}));

vi.mock('@/hooks/useExamApi', () => ({
  useExamBlueprint: vi.fn(() => ({ data: null, loading: false })),
  useCreateExamBlueprint: vi.fn(() => ({ create: vi.fn(), loading: false })),
  useUpdateExamBlueprint: vi.fn(() => ({ update: vi.fn(), loading: false })),
}));

vi.mock('./BlueprintBasicFields', () => ({
  BlueprintBasicFields: () => <div data-testid="basic-fields" />,
}));

vi.mock('./BlueprintDistributions', () => ({
  BlueprintDistributions: () => <div data-testid="distributions" />,
}));

vi.mock('./BlueprintCatSettings', () => ({
  BlueprintCatSettings: () => <div data-testid="cat-settings" />,
}));

import { ExamBlueprintBuilderPage } from './ExamBlueprintBuilderPage';

describe('ExamBlueprintBuilderPage', () => {
  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><ExamBlueprintBuilderPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

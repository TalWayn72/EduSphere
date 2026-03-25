import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form');
  return {
    ...actual,
    useForm: () => ({
      register: vi.fn(() => ({})),
      handleSubmit: vi.fn((cb: () => void) => (e: Event) => { e?.preventDefault?.(); cb(); }),
      watch: vi.fn(),
      trigger: vi.fn().mockResolvedValue(true),
      getValues: vi.fn(() => ({})),
      formState: { errors: {}, isValid: true },
      control: {},
    }),
    FormProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(),
}));

vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="public-layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./StepIndicator', () => ({
  StepIndicator: () => <div data-testid="step-indicator" />,
}));

vi.mock('./steps/AccountStep', () => ({
  AccountStep: () => <div data-testid="account-step" />,
}));

vi.mock('./steps/OrgDetailsStep', () => ({
  OrgDetailsStep: () => <div data-testid="org-details-step" />,
}));

vi.mock('./steps/BrandingStep', () => ({
  BrandingStep: () => <div data-testid="branding-step" />,
}));

import { OrgSignupWizard } from './OrgSignupWizard';

describe('OrgSignupWizard', () => {
  it('renders step indicator', () => {
    render(<MemoryRouter><OrgSignupWizard /></MemoryRouter>);
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
  });

  it('renders first step (account) by default', () => {
    render(<MemoryRouter><OrgSignupWizard /></MemoryRouter>);
    expect(screen.getByTestId('account-step')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><OrgSignupWizard /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

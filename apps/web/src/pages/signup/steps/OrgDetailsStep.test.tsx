import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    register: vi.fn(() => ({})),
    watch: vi.fn(() => ''),
    setValue: vi.fn(),
    formState: { errors: {} },
  }),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock('./SlugField', () => ({
  SlugField: () => <div data-testid="slug-field" />,
}));

import { OrgDetailsStep } from './OrgDetailsStep';

describe('OrgDetailsStep', () => {
  it('renders without crash', () => {
    const { container } = render(<OrgDetailsStep />);
    expect(container).toBeTruthy();
  });
});

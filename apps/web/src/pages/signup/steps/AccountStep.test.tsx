import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    register: vi.fn(() => ({})),
    formState: { errors: {} },
    setValue: vi.fn(),
    watch: vi.fn(() => false),
  }),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: Record<string, unknown>) => <input type="checkbox" {...props} />,
}));

import { AccountStep } from './AccountStep';

describe('AccountStep', () => {
  it('renders without crash', () => {
    const { container } = render(<AccountStep />);
    expect(container).toBeTruthy();
  });
});

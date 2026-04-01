import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    register: vi.fn(() => ({})),
    watch: vi.fn(() => '#3b82f6'),
    setValue: vi.fn(),
    formState: { errors: {} },
  }),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

import { BrandingStep } from './BrandingStep';

describe('BrandingStep', () => {
  it('renders without crash', () => {
    const { container } = render(<BrandingStep />);
    expect(container).toBeTruthy();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders without crash at step 0', () => {
    const { container } = render(<StepIndicator current={0} total={3} />);
    expect(container).toBeTruthy();
  });

  it('renders without crash at step 1', () => {
    const { container } = render(<StepIndicator current={1} total={3} />);
    expect(container).toBeTruthy();
  });

  it('renders nav element', () => {
    const { container } = render(<StepIndicator current={0} total={3} />);
    expect(container.querySelector('nav')).toBeTruthy();
  });
});

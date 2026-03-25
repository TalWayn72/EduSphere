import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('./use-learning-path', () => ({
  useLearningPath: () => ({ path: [], loading: false }),
}));

import { LearningPathPanel } from './LearningPathPanel';

describe('LearningPathPanel', () => {
  it('renders without crash', () => {
    const { container } = render(<LearningPathPanel targetNodeId="n-1" />);
    expect(container).toBeTruthy();
  });
});

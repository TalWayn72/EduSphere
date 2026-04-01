import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: { div: (p: Record<string, unknown>) => <div {...p} /> },
}));
vi.mock('@/providers/ReducedMotionProvider', () => ({
  useReducedMotion: () => true,
}));

import { MotionCard } from './MotionCard';

describe('MotionCard', () => {
  it('renders children in reduced motion mode', () => {
    render(
      <MotionCard>
        <span data-testid="child">Content</span>
      </MotionCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(
      <MotionCard className="my-class">Content</MotionCard>
    );
    expect(container.firstElementChild?.className).toContain('my-class');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/providers/ReducedMotionProvider', () => ({
  useReducedMotion: () => true,
}));

import { AnimatedCounter } from './AnimatedCounter';

describe('AnimatedCounter', () => {
  it('renders target value immediately with reduced motion', () => {
    render(<AnimatedCounter target={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders with prefix and suffix', () => {
    render(<AnimatedCounter target={50} prefix="$" suffix="+" />);
    expect(document.body.textContent).toContain('$');
    expect(document.body.textContent).toContain('+');
  });
});

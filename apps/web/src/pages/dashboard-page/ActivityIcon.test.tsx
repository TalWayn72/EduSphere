import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ActivityIcon } from './ActivityIcon';

describe('ActivityIcon', () => {
  it('renders without crash', () => {
    const { container } = render(<ActivityIcon type="lesson_complete" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders for quiz_passed type', () => {
    const { container } = render(<ActivityIcon type="quiz_passed" />);
    expect(container).toBeTruthy();
  });

  it('renders for unknown type', () => {
    const { container } = render(<ActivityIcon type="unknown" />);
    expect(container).toBeTruthy();
  });
});

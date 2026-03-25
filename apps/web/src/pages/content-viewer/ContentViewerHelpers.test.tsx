import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import { SkeletonLine, ErrorBanner } from './ContentViewerHelpers';

describe('ContentViewerHelpers', () => {
  it('SkeletonLine renders without crash', () => {
    const { container } = render(<SkeletonLine />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('ErrorBanner renders message', () => {
    const { container } = render(<ErrorBanner message="Something went wrong" />);
    expect(container.textContent).toContain('Something went wrong');
  });
});

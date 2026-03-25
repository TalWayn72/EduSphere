import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResultCard, ExpandableText } from './ResultCard';

describe('ResultCard', () => {
  it('renders title and icon', () => {
    render(<ResultCard icon="📊" title="Summary" testId="summary-card"><p>Content</p></ResultCard>);
    expect(screen.getByText(/Summary/)).toBeInTheDocument();
    expect(screen.getByTestId('summary-card')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<ResultCard icon="📊" title="Test" testId="test-card"><span>Child text</span></ResultCard>);
    expect(screen.getByText('Child text')).toBeInTheDocument();
  });
});

describe('ExpandableText', () => {
  it('shows full text when under limit', () => {
    render(<ExpandableText text="Short text" testId="short" />);
    expect(screen.getByTestId('short')).toHaveTextContent('Short text');
  });

  it('truncates text over limit', () => {
    const longText = 'A'.repeat(700);
    render(<ExpandableText text={longText} limit={600} testId="long" />);
    expect(screen.getByTestId('long').textContent).toContain('...');
  });

  it('shows expand button for long text', () => {
    const longText = 'B'.repeat(700);
    render(<ExpandableText text={longText} limit={600} testId="long2" />);
    expect(screen.getByTestId('long2-expand')).toBeInTheDocument();
  });

  it('expands text on button click', () => {
    const longText = 'C'.repeat(700);
    render(<ExpandableText text={longText} limit={600} testId="long3" />);
    fireEvent.click(screen.getByTestId('long3-expand'));
    expect(screen.getByTestId('long3').textContent).not.toContain('...');
  });
});

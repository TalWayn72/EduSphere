import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Highlight } from './Highlight';

describe('Highlight', () => {
  it('renders plain text when query is empty', () => {
    render(<Highlight text="Hello world" query="" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders plain text when query is too short', () => {
    render(<Highlight text="Hello world" query="H" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('highlights matching substring', () => {
    const { container } = render(
      <Highlight text="Hello world" query="world" />
    );
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('world');
  });

  it('highlights case-insensitively', () => {
    const { container } = render(
      <Highlight text="Hello World" query="hello" />
    );
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('Hello');
  });

  it('highlights multiple occurrences', () => {
    const { container } = render(<Highlight text="ab ab ab" query="ab" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(3);
  });

  it('escapes regex special characters', () => {
    const { container } = render(
      <Highlight text="price is $10.00" query="$10" />
    );
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
  });
});

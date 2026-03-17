import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('renders h2 by default', () => {
    render(<SectionHeader title="Overview" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Overview');
  });

  it('renders h3 when level="h3"', () => {
    render(<SectionHeader title="Details" level="h3" />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Details');
  });

  it('title gets auto-generated id', () => {
    render(<SectionHeader title="My Section Title" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('id', 'my-section-title');
  });

  it('custom id overrides auto-generated', () => {
    render(<SectionHeader title="My Section" id="custom-id" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('id', 'custom-id');
  });

  it('renders description when provided', () => {
    render(<SectionHeader title="Title" description="Some details" />);
    expect(screen.getByText('Some details')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<SectionHeader title="Title" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders actions slot', () => {
    render(
      <SectionHeader title="Section" actions={<button>Add</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SectionHeader title="Test" className="mt-8" />,
    );
    expect(container.firstElementChild?.className).toContain('mt-8');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UniqueFeaturesSection } from './UniqueFeaturesSection';

vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === '__esModule') return true;
          return function MockIcon(props: Record<string, unknown>) {
            return <span data-testid={`icon-${String(name)}`} {...props} />;
          };
        },
      }
    )
);

vi.mock('@/components/ui/badge', () => ({
  Badge: function MockBadge({ children, ...props }: Record<string, unknown>) {
    return <span {...props}>{children as React.ReactNode}</span>;
  },
}));

describe('UniqueFeaturesSection', () => {
  it('renders without crashing', () => {
    render(<UniqueFeaturesSection />);
    expect(screen.getByTestId('unique-features-section')).toBeInTheDocument();
  });

  it('has correct section id for anchor navigation', () => {
    const { container } = render(<UniqueFeaturesSection />);
    expect(container.querySelector('#features')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<UniqueFeaturesSection />);
    expect(
      screen.getByText('Three Capabilities No Other LMS Offers')
    ).toBeInTheDocument();
  });

  it('renders all 3 feature cards with titles', () => {
    render(<UniqueFeaturesSection />);
    expect(
      screen.getByText('Knowledge Graph Intelligence')
    ).toBeInTheDocument();
    expect(screen.getByText('Visual Anchoring Sidebar')).toBeInTheDocument();
    expect(screen.getByText('AI Course Builder')).toBeInTheDocument();
  });

  it('renders all 3 feature badges', () => {
    render(<UniqueFeaturesSection />);
    expect(screen.getByText('GraphRAG Native')).toBeInTheDocument();
    expect(screen.getByText('Patent Pending')).toBeInTheDocument();
    expect(screen.getByText('Unique in LMS Market')).toBeInTheDocument();
  });

  it('renders the detail/stat lines for each feature', () => {
    render(<UniqueFeaturesSection />);
    expect(
      screen.getByText(/45–71% fewer AI hallucinations/)
    ).toBeInTheDocument();
    expect(screen.getByText(/\+30% knowledge retention/)).toBeInTheDocument();
    expect(screen.getByText(/60% instructor time savings/)).toBeInTheDocument();
  });
});

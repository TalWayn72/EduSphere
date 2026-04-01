import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { HeroSection } from './HeroSection';

vi.mock('@remotion/player', () => ({
  Player: function MockPlayer() {
    return <div data-testid="remotion-player" />;
  },
}));

vi.mock('@/remotion/KnowledgeGraphGrow', () => ({
  KnowledgeGraphGrow: function MockKnowledgeGraphGrow() {
    return null;
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: function MockButton({
    children,
    asChild: _asChild,
    ...props
  }: Record<string, unknown>) {
    return <div {...props}>{children as React.ReactNode}</div>;
  },
}));

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('@/providers/ReducedMotionProvider', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('HeroSection', () => {
  it('renders without crashing', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
  });

  it('renders the main heading', () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /The AI-Native LMS/i
    );
  });

  it('renders both CTA links pointing to /pilot', () => {
    renderWithRouter(<HeroSection />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs.filter((h) => h === '/pilot')).toHaveLength(2);
    expect(screen.getByText('Request Demo')).toBeInTheDocument();
    expect(screen.getByText('Start 90-Day Pilot')).toBeInTheDocument();
  });

  it('shows Remotion Player when reduced motion is off', () => {
    mockUseReducedMotion.mockReturnValue(false);
    renderWithRouter(<HeroSection />);
    expect(screen.getByTestId('remotion-player')).toBeInTheDocument();
  });

  it('hides Remotion Player when reduced motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    renderWithRouter(<HeroSection />);
    expect(screen.queryByTestId('remotion-player')).not.toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VideoSection } from './VideoSection';

vi.mock('@remotion/player', () => ({
  Player: function MockPlayer() {
    return <div data-testid="remotion-player" />;
  },
}));

vi.mock('@/remotion/LiveCollab', () => ({
  LiveCollab: function MockLiveCollab() {
    return null;
  },
}));

const mockUseReducedMotion = vi.fn(() => false);
vi.mock('@/providers/ReducedMotionProvider', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe('VideoSection', () => {
  it('renders without crashing', () => {
    render(<VideoSection />);
    expect(screen.getByTestId('video-section')).toBeInTheDocument();
  });

  it('has correct section id for anchor navigation', () => {
    const { container } = render(<VideoSection />);
    expect(container.querySelector('#demo')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<VideoSection />);
    expect(screen.getByText('See EduSphere in Action')).toBeInTheDocument();
  });

  it('renders the Remotion Player when reduced motion is off', () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(<VideoSection />);
    expect(screen.getByTestId('remotion-player')).toBeInTheDocument();
    expect(screen.queryByText(/Motion reduced/)).not.toBeInTheDocument();
  });

  it('shows static fallback text when reduced motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<VideoSection />);
    expect(screen.queryByTestId('remotion-player')).not.toBeInTheDocument();
    expect(screen.getByText('Live Collaboration Demo')).toBeInTheDocument();
    expect(screen.getByText(/Motion reduced/)).toBeInTheDocument();
  });
});

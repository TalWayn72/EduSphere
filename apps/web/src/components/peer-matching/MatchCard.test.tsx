import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchCard } from './MatchCard';

describe('MatchCard', () => {
  const props = {
    userId: 'user-abc',
    matchReason: 'Similar interests',
    complementarySkills: ['React', 'Node.js'],
    sharedCourseCount: 3,
    onConnect: vi.fn(),
  };

  it('renders match reason', () => {
    render(<MatchCard {...props} />);
    expect(screen.getByText('Similar interests')).toBeInTheDocument();
  });

  it('shows complementary skills', () => {
    render(<MatchCard {...props} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('calls onConnect when button clicked', () => {
    render(<MatchCard {...props} />);
    fireEvent.click(screen.getByText('Connect'));
    expect(props.onConnect).toHaveBeenCalledWith('user-abc');
  });

  it('shows connecting state', () => {
    render(<MatchCard {...props} isConnecting />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });
});

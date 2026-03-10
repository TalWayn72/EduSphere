import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Leaderboard } from './Leaderboard';

describe('Leaderboard', () => {
  const entries = [
    { id: '1', userId: 'user-a', score: 95, rank: 1, completedAt: null },
    { id: '2', userId: 'user-b', score: 80, rank: 2, completedAt: null },
  ];

  it('renders leaderboard entries', () => {
    render(<Leaderboard entries={entries} />);
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<Leaderboard entries={[]} />);
    expect(screen.getByText(/[Nn]o.*entries|[Ee]mpty/i)).toBeInTheDocument();
  });
});

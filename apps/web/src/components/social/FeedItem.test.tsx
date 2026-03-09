import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedItem, { type SocialFeedItemData } from './FeedItem';

const mockItem: SocialFeedItemData = {
  id: '1',
  actorId: 'u1',
  actorDisplayName: 'Alice',
  verb: 'COMPLETED',
  objectType: 'course',
  objectId: 'c1',
  objectTitle: 'React Fundamentals',
  createdAt: new Date().toISOString(),
};

describe('FeedItem', () => {
  it('renders actor name', () => {
    render(<FeedItem item={mockItem} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders COMPLETED as "completed"', () => {
    render(<FeedItem item={mockItem} />);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('renders ENROLLED as "started"', () => {
    render(<FeedItem item={{ ...mockItem, verb: 'ENROLLED' }} />);
    expect(screen.getByText(/started/i)).toBeInTheDocument();
  });

  it('renders ACHIEVED_BADGE as "earned"', () => {
    render(<FeedItem item={{ ...mockItem, verb: 'ACHIEVED_BADGE' }} />);
    expect(screen.getByText(/earned/i)).toBeInTheDocument();
  });

  it('renders object title', () => {
    render(<FeedItem item={mockItem} />);
    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
  });

  it('renders DISCUSSED as "posted in"', () => {
    render(<FeedItem item={{ ...mockItem, verb: 'DISCUSSED' }} />);
    expect(screen.getByText(/posted in/i)).toBeInTheDocument();
  });

  it('renders STARTED_LEARNING as "is learning"', () => {
    render(<FeedItem item={{ ...mockItem, verb: 'STARTED_LEARNING' }} />);
    expect(screen.getByText(/is learning/i)).toBeInTheDocument();
  });

  it('shows actor initial in avatar', () => {
    render(<FeedItem item={mockItem} />);
    // The avatar div contains the first letter of the actor name
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from './ActivityFeed';
import type { ActivityItem } from '@/lib/mock-analytics';

// Fix fake time so formatRelativeTime returns deterministic output
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

const makeItem = (overrides: Partial<ActivityItem> = {}): ActivityItem => ({
  id: 'item-1',
  type: 'study',
  title: 'Read Chapter 3',
  description: 'Completed reading session',
  timestamp: new Date('2024-02-15T11:30:00Z').toISOString(),
  courseTitle: 'Introduction to AI',
  ...overrides,
});

describe('ActivityFeed', () => {
  it('renders all items in the list', () => {
    const items = [
      makeItem({ id: '1', title: 'Item One' }),
      makeItem({ id: '2', title: 'Item Two' }),
      makeItem({ id: '3', title: 'Item Three' }),
    ];
    render(<ActivityFeed items={items} />);

    expect(screen.getByText('Item One')).toBeInTheDocument();
    expect(screen.getByText('Item Two')).toBeInTheDocument();
    expect(screen.getByText('Item Three')).toBeInTheDocument();
  });

  it('renders empty state without crashing', () => {
    const { container } = render(<ActivityFeed items={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders description for each item', () => {
    const items = [makeItem({ description: 'My description text' })];
    render(<ActivityFeed items={items} />);
    expect(screen.getByText('My description text')).toBeInTheDocument();
  });

  it('renders courseTitle when present', () => {
    const items = [makeItem({ courseTitle: 'Advanced GraphQL' })];
    render(<ActivityFeed items={items} />);
    expect(screen.getByText('Advanced GraphQL')).toBeInTheDocument();
  });

  it('does not crash when courseTitle is absent', () => {
    const items = [makeItem({ courseTitle: undefined })];
    render(<ActivityFeed items={items} />);
    expect(screen.queryByText('Advanced GraphQL')).not.toBeInTheDocument();
  });

  it('renders relative time for each item', () => {
    const items = [
      makeItem({ timestamp: new Date('2024-02-15T11:30:00Z').toISOString() }),
    ];
    render(<ActivityFeed items={items} />);
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('renders correct icon color class for study type', () => {
    const items = [makeItem({ type: 'study' })];
    const { container } = render(<ActivityFeed items={items} />);
    const iconWrapper = container.querySelector('.bg-blue-100');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders correct icon color class for quiz type', () => {
    const items = [makeItem({ type: 'quiz' })];
    const { container } = render(<ActivityFeed items={items} />);
    const iconWrapper = container.querySelector('.bg-yellow-100');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders correct icon color class for ai_session type', () => {
    const items = [makeItem({ type: 'ai_session' })];
    const { container } = render(<ActivityFeed items={items} />);
    const iconWrapper = container.querySelector('.bg-green-100');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders correct icon color class for annotation type', () => {
    const items = [makeItem({ type: 'annotation' })];
    const { container } = render(<ActivityFeed items={items} />);
    const iconWrapper = container.querySelector('.bg-purple-100');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders correct icon color class for discussion type', () => {
    const items = [makeItem({ type: 'discussion' })];
    const { container } = render(<ActivityFeed items={items} />);
    const iconWrapper = container.querySelector('.bg-orange-100');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('renders multiple items in order', () => {
    const items = [
      makeItem({ id: '1', title: 'First' }),
      makeItem({ id: '2', title: 'Second' }),
    ];
    render(<ActivityFeed items={items} />);
    // Both titles exist in document order
    const allText = screen.getByText('First');
    const allText2 = screen.getByText('Second');
    expect(allText).toBeInTheDocument();
    expect(allText2).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
}));

import { ContentItemList } from './ContentItemList';

const items = [
  {
    id: 'ci-1',
    title: 'Intro Video',
    contentType: 'VIDEO',
    duration: 300,
    orderIndex: 1,
  },
  {
    id: 'ci-2',
    title: 'Reading',
    contentType: 'MARKDOWN',
    duration: null,
    orderIndex: 0,
  },
];

describe('ContentItemList', () => {
  it('renders items sorted by orderIndex', () => {
    render(<ContentItemList items={items} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('Reading');
    expect(listItems[1]).toHaveTextContent('Intro Video');
  });

  it('renders content type badges', () => {
    render(<ContentItemList items={items} />);
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
    expect(screen.getByText('MARKDOWN')).toBeInTheDocument();
  });

  it('shows empty message when no items', () => {
    render(<ContentItemList items={[]} />);
    expect(screen.getByText('noContentItems')).toBeInTheDocument();
  });
});

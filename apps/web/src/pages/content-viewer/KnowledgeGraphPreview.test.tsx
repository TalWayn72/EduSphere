import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Network: () => <span>network</span>,
  Search: () => <span>search</span>,
  ChevronRight: () => <span>chevron</span>,
}));

vi.mock('@/lib/mock-graph-data', () => ({
  mockGraphData: { nodes: [{ id: 'n1', label: 'Node 1', type: 'CONCEPT' }], edges: [] },
}));

import { KnowledgeGraphPreview } from './KnowledgeGraphPreview';

describe('KnowledgeGraphPreview', () => {
  it('renders without crash', () => {
    const { container } = render(
      <KnowledgeGraphPreview
        searchQuery=""
        transcript={[]}
        annotations={[]}
        onSearchChange={vi.fn()}
        onSeek={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});

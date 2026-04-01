import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  BookOpen: () => <span>book</span>,
  ChevronRight: () => <span>chevron</span>,
  Loader2: () => <span>loader</span>,
  Network: () => <span>network</span>,
}));

vi.mock('./constants', () => ({
  NODE_COLOR: {},
  EDGE_COLOR: {},
  TYPE_LABEL: {},
}));

vi.mock('./LearningPathPanel', () => ({
  LearningPathPanel: () => <div data-testid="learning-path" />,
}));

import { GraphSidebar } from './GraphSidebar';

const baseProps = {
  selectedNode: undefined,
  effectiveSelectedId: null,
  connectedEdges: [],
  graphData: { nodes: [], edges: [] },
  relatedFetching: false,
  relatedByName: [],
  relatedByNameFetching: false,
  selectedNodeName: '',
  onSelectNode: vi.fn(),
  pathFrom: '',
  setPathFrom: vi.fn(),
  pathTo: '',
  setPathTo: vi.fn(),
  pathSearchTrigger: null,
  pathError: null,
  learningPath: null,
  learningPathError: false,
  isPathLoading: false,
  mockPathLoading: false,
  onFindPath: vi.fn(),
};

describe('GraphSidebar', () => {
  it('renders without crash when no node selected', () => {
    const { container } = render(
      <MemoryRouter>
        <GraphSidebar {...baseProps} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders without crash with selected node', () => {
    const node = {
      id: 'n-1',
      label: 'Concept A',
      type: 'CONCEPT' as const,
      x: 0,
      y: 0,
    };
    const { container } = render(
      <MemoryRouter>
        <GraphSidebar
          {...baseProps}
          selectedNode={node}
          effectiveSelectedId="n-1"
          selectedNodeName="Concept A"
        />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});

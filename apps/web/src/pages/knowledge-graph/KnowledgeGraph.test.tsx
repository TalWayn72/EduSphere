import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Search: () => <span>search</span>,
  Loader2: () => <span>loader</span>,
  RefreshCw: () => <span>refresh</span>,
  Network: () => <span>network</span>,
  User: () => <span>user</span>,
}));

vi.mock('../PersonalGraphView', () => ({
  PersonalGraphView: () => <div data-testid="personal-graph" />,
}));

vi.mock('./constants', () => ({
  TYPE_LABEL: {},
  EDGE_COLOR: {},
  TYPE_FILTER_STYLE: {},
  computePositions: () => ({}),
}));

vi.mock('./use-graph-data', () => ({
  useGraphData: () => ({
    graphData: { nodes: [], edges: [] },
    isLoading: false,
    conceptsResult: { error: null },
    errorKind: null,
    toast: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedNodeId: null,
    setSelectedNodeId: vi.fn(),
    effectiveSelectedId: null,
    connectedEdges: [],
    connectedIds: new Set(),
    visibleIds: new Set(),
    relatedResult: { fetching: false },
    relatedByName: [],
    relatedByNameResult: { fetching: false },
    selectedNodeName: '',
    typeFilter: null,
    setTypeFilter: vi.fn(),
    handleRefresh: vi.fn(),
  }),
}));

vi.mock('./use-graph-viewport', () => ({
  useGraphViewport: () => ({
    svgRef: { current: null },
    scale: 1,
    translate: { x: 0, y: 0 },
    handleZoomIn: vi.fn(),
    handleZoomOut: vi.fn(),
    handleReset: vi.fn(),
    onMouseDown: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseUp: vi.fn(),
  }),
}));

vi.mock('./use-learning-path', () => ({
  useLearningPath: () => ({
    pathFrom: '',
    setPathFrom: vi.fn(),
    pathTo: '',
    setPathTo: vi.fn(),
    pathSearchTrigger: null,
    pathError: null,
    learningPath: null,
    learningPathResult: { error: null },
    isPathLoading: false,
    mockPathLoading: false,
    pathNodeIds: new Set(),
    handleFindPath: vi.fn(),
  }),
}));

vi.mock('./GraphCanvas', () => ({
  GraphCanvas: () => <div data-testid="graph-canvas" />,
}));

vi.mock('./GraphControls', () => ({
  GraphControls: () => <div data-testid="graph-controls" />,
}));

vi.mock('./GraphSidebar', () => ({
  GraphSidebar: () => <div data-testid="graph-sidebar" />,
}));

import { KnowledgeGraph } from './KnowledgeGraph';

describe('KnowledgeGraph', () => {
  it('renders inside Layout', () => {
    render(<MemoryRouter><KnowledgeGraph /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><KnowledgeGraph /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});

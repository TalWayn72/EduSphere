import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('./constants', () => ({
  NODE_COLOR: {},
  EDGE_COLOR: {},
  SVG_W: 800,
  SVG_H: 600,
  CX: 400,
  CY: 300,
}));

import { GraphCanvas } from './GraphCanvas';

describe('GraphCanvas', () => {
  it('renders without crash', () => {
    const { container } = render(
      <GraphCanvas
        svgRef={{ current: null }}
        scale={1}
        translate={{ x: 0, y: 0 }}
        graphData={{ nodes: [], edges: [] }}
        positions={{}}
        effectiveSelectedId={null}
        connectedIds={new Set()}
        visibleIds={new Set()}
        pathNodeIds={new Set()}
        onMouseDown={vi.fn()}
        onMouseMove={vi.fn()}
        onMouseUp={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});

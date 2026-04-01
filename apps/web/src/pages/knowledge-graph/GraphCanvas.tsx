import React from 'react';
import type { GraphNode, GraphEdge } from '@/lib/mock-graph-data';
import { NODE_COLOR, EDGE_COLOR, SVG_W, SVG_H, CX, CY } from './constants';

const SVG_STYLE: React.CSSProperties = { maxHeight: '420px' };
const POINTER_STYLE: React.CSSProperties = { cursor: 'pointer' };

interface GraphCanvasProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  scale: number;
  translate: { x: number; y: number };
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
  positions: Record<string, { x: number; y: number }>;
  effectiveSelectedId: string | null;
  connectedIds: Set<string>;
  visibleIds: Set<string>;
  pathNodeIds: Set<string>;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onSelectNode: (id: string) => void;
}

export const GraphCanvas = React.memo(function GraphCanvas({
  svgRef,
  scale,
  translate,
  graphData,
  positions,
  effectiveSelectedId,
  connectedIds,
  visibleIds,
  pathNodeIds,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSelectNode,
}: GraphCanvasProps) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full cursor-grab active:cursor-grabbing select-none"
      style={SVG_STYLE}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <g
        transform={`translate(${CX + translate.x},${CY + translate.y}) scale(${scale}) translate(${-CX},${-CY})`}
      >
        {graphData.edges.map((e) => {
          const from = positions[e.source];
          const to = positions[e.target];
          if (!from || !to) return null;
          const isActive =
            connectedIds.has(e.source) &&
            connectedIds.has(e.target) &&
            (e.source === effectiveSelectedId ||
              e.target === effectiveSelectedId);
          const dimmed = !visibleIds.has(e.source) || !visibleIds.has(e.target);
          return (
            <line
              key={e.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isActive ? EDGE_COLOR[e.type] : '#cbd5e1'}
              strokeWidth={isActive ? 2 : 1}
              opacity={dimmed ? 0.15 : isActive ? 1 : 0.45}
              strokeDasharray={e.type === 'CONTRADICTS' ? '5,3' : undefined}
            />
          );
        })}
        {graphData.nodes.map((n) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const isSelected = n.id === effectiveSelectedId;
          const isConnected = connectedIds.has(n.id);
          const isOnPath = pathNodeIds.has(n.id);
          const dimmed = !visibleIds.has(n.id);
          const r = isSelected ? 18 : 13;
          return (
            <g
              key={n.id}
              data-node={n.id}
              onClick={() => onSelectNode(n.id)}
              style={POINTER_STYLE}
            >
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  opacity={0.4}
                />
              )}
              {isOnPath && !isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth={2.5}
                  opacity={0.85}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={NODE_COLOR[n.type] ?? '#94a3b8'}
                opacity={
                  dimmed ? 0.2 : isSelected ? 1 : isConnected ? 0.9 : 0.6
                }
                stroke={isOnPath ? '#facc15' : isSelected ? '#1d4ed8' : 'white'}
                strokeWidth={isOnPath ? 3 : isSelected ? 2.5 : 1.5}
              />
              <text
                x={pos.x}
                y={pos.y + r + 13}
                textAnchor="middle"
                fontSize={isSelected ? 10 : 9}
                fontWeight={isOnPath || isSelected ? 700 : 400}
                fill={dimmed ? '#cbd5e1' : '#1e293b'}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});

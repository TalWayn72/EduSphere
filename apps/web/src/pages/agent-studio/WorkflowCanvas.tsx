/**
 * WorkflowCanvas — SVG-based canvas for placing workflow nodes and edges.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';
import type { WorkflowNode, WorkflowEdge } from './agent-studio.types';
import { NODE_META } from './agent-studio.types';

interface WorkflowCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selected: string | null;
  connecting: string | null;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onNodeClick: (nodeId: string) => void;
  onCanvasClick: () => void;
}

export function WorkflowCanvas({
  canvasRef,
  nodes,
  edges,
  selected,
  connecting,
  onDrop,
  onNodeClick,
  onCanvasClick,
}: WorkflowCanvasProps) {
  return (
    <Card
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-muted/20"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      data-testid="workflow-canvas"
      onClick={() => {
        if (!connecting) onCanvasClick();
      }}
    >
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none gap-2">
          <PlusCircle className="h-8 w-8 opacity-30" />
          <p className="text-sm">Drag nodes here to build your workflow</p>
        </div>
      )}

      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge) => {
          const src = nodes.find((n) => n.id === edge.source);
          const tgt = nodes.find((n) => n.id === edge.target);
          if (!src || !tgt) return null;
          const x1 = src.x + 60;
          const y1 = src.y + 20;
          const x2 = tgt.x;
          const y2 = tgt.y + 20;
          return (
            <g key={edge.id}>
              <path
                d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                stroke="#94a3b8"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const meta = NODE_META[node.type];
        const isSelected = selected === node.id;
        const isConnectSource = connecting === node.id;
        return (
          <button
            key={node.id}
            className={cn(
              'absolute flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold shadow-sm transition-all',
              meta.bg,
              meta.color,
              isSelected && 'ring-2 ring-primary shadow-md',
              isConnectSource && 'ring-2 ring-orange-400 animate-pulse'
            )}
            style={{ left: node.x, top: node.y }}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(node.id);
            }}
            data-testid={`workflow-node-${node.id}`}
            aria-pressed={isSelected}
          >
            {meta.icon}
            {node.label}
          </button>
        );
      })}

      {/* Connection mode indicator */}
      {connecting && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-orange-100 border border-orange-300 text-orange-800 text-xs px-3 py-1.5 rounded-full shadow-sm pointer-events-none dark:bg-orange-900 dark:border-orange-600 dark:text-orange-200">
          Click a target node to connect
        </div>
      )}
    </Card>
  );
}

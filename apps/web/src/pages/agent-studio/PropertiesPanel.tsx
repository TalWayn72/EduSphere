/**
 * PropertiesPanel — right-side panel for editing selected node properties.
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowNode, WorkflowEdge } from './agent-studio.types';
import { NODE_META } from './agent-studio.types';

interface PropertiesPanelProps {
  selectedNode: WorkflowNode | undefined;
  connecting: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onLabelChange: (nodeId: string, label: string) => void;
  onDelete: () => void;
}

export function PropertiesPanel({
  selectedNode,
  connecting,
  nodes,
  edges,
  onLabelChange,
  onDelete,
}: PropertiesPanelProps) {
  return (
    <Card
      className="w-48 flex-shrink-0 p-3 overflow-y-auto"
      data-testid="properties-panel"
    >
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Properties
      </p>
      {selectedNode ? (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Type</label>
            <p
              className={cn(
                'text-xs font-semibold mt-0.5',
                NODE_META[selectedNode.type].color
              )}
            >
              {NODE_META[selectedNode.type].label}
            </p>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Label</label>
            <input
              value={selectedNode.label}
              onChange={(e) => onLabelChange(selectedNode.id, e.target.value)}
              className="w-full text-xs mt-0.5 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="node-label-input"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">
              Connections out:{' '}
              {edges.filter((e) => e.source === selectedNode.id).length}
            </label>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            data-testid="delete-node-btn"
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {connecting
            ? 'Click a node on the canvas to connect'
            : 'Select a node to edit its properties'}
        </p>
      )}

      {nodes.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-[10px] text-muted-foreground mb-1">Workflow</p>
          <p className="text-xs">{nodes.length} nodes</p>
          <p className="text-xs">{edges.length} connections</p>
        </div>
      )}
    </Card>
  );
}

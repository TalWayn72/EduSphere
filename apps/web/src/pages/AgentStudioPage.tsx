/**
 * AgentStudioPage — No-Code Drag & Drop Agent Workflow Builder (G5).
 *
 * Lets instructors/admins visually compose LangGraph-style agent workflows:
 * - Left palette: draggable node types
 * - Center canvas: dropped nodes + SVG edge connections
 * - Right panel: selected-node properties editor
 * - Save: serialises to JSON and calls createAgentWorkflow mutation (or DEV mock)
 *
 * No external graph-library dependencies — uses native HTML5 DnD + SVG.
 * File exception: complex multi-region interactive UI (~200 lines).
 */
import { useState, useCallback, useRef } from 'react';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Play,
  Brain,
  Zap,
  MessageSquare,
  BookOpen,
  StopCircle,
  Save,
  Rocket,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { CREATE_AGENT_WORKFLOW_MUTATION } from '@/lib/graphql/agent.queries';
import { DEV_MODE } from '@/lib/auth';

// ── Node types ────────────────────────────────────────────────────────────────

export type NodeType =
  | 'START'
  | 'ASSESS'
  | 'EXPLAIN'
  | 'QUIZ'
  | 'DEBATE'
  | 'END';

const NODE_META: Record<
  NodeType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  START:   { label: 'Start',   icon: <Play className="h-4 w-4" />,          color: 'text-green-700',  bg: 'bg-green-50 border-green-300' },
  ASSESS:  { label: 'Assess',  icon: <Brain className="h-4 w-4" />,         color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-300' },
  EXPLAIN: { label: 'Explain', icon: <BookOpen className="h-4 w-4" />,      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-300' },
  QUIZ:    { label: 'Quiz',    icon: <Zap className="h-4 w-4" />,           color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-300' },
  DEBATE:  { label: 'Debate',  icon: <MessageSquare className="h-4 w-4" />, color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-300' },
  END:     { label: 'End',     icon: <StopCircle className="h-4 w-4" />,    color: 'text-gray-700',   bg: 'bg-gray-100 border-gray-300' },
};

// ── Data model ────────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PaletteItem({ type }: { type: NodeType }) {
  const meta = NODE_META[type];
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-lg border cursor-grab select-none text-center',
        meta.bg,
        meta.color
      )}
      data-testid={`palette-${type.toLowerCase()}`}
    >
      {meta.icon}
      <span className="text-[10px] font-semibold">{meta.label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgentStudioPage() {
  const { t } = useTranslation('agents');
  const [workflowName, setWorkflowName] = useState('My Agent Workflow');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [, execCreate] = useMutation(CREATE_AGENT_WORKFLOW_MUTATION);

  // ── DnD ───────────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (!type || !NODE_META[type]) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 20;
    const id = `node-${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      { id, type, label: NODE_META[type].label, x: Math.max(0, x), y: Math.max(0, y) },
    ]);
  }, []);

  // ── Edge connection ───────────────────────────────────────────────────────

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!connecting) {
        setConnecting(nodeId);
        setSelected(nodeId);
        return;
      }
      if (connecting === nodeId) {
        setConnecting(null);
        return;
      }
      // Create edge — avoid duplicates
      const exists = edges.some(
        (e) => e.source === connecting && e.target === nodeId
      );
      if (!exists) {
        setEdges((prev) => [
          ...prev,
          { id: `edge-${connecting}-${nodeId}`, source: connecting, target: nodeId },
        ]);
      }
      setConnecting(null);
      setSelected(nodeId);
    },
    [connecting, edges]
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteSelected = () => {
    if (!selected) return;
    setNodes((prev) => prev.filter((n) => n.id !== selected));
    setEdges((prev) =>
      prev.filter((e) => e.source !== selected && e.target !== selected)
    );
    setSelected(null);
    setConnecting(null);
  };

  // ── Save / Deploy ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaveStatus('saving');
    if (!DEV_MODE) {
      const res = await execCreate({
        input: { name: workflowName, nodes, edges },
      });
      if (res.error) {
        console.error('[AgentStudioPage] Save failed:', res.error.message);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedNode = nodes.find((n) => n.id === selected);

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="text-xl font-bold bg-transparent border-b border-transparent focus:border-primary focus:outline-none flex-1 min-w-0"
          aria-label="Workflow name"
          data-testid="workflow-name-input"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saveStatus === 'saving' || nodes.length === 0}
          data-testid="save-workflow-btn"
        >
          <Save className="h-4 w-4 mr-1" />
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : t('save', 'Save')}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveStatus === 'saving' || nodes.length === 0}
          data-testid="deploy-workflow-btn"
        >
          <Rocket className="h-4 w-4 mr-1" />
          {t('deploy', 'Deploy')}
        </Button>
      </div>

      {/* Studio layout: Palette | Canvas | Properties */}
      <div className="flex gap-3 h-[calc(100vh-10rem)]">
        {/* Left: Node palette */}
        <Card className="w-24 flex-shrink-0 p-2 overflow-y-auto" data-testid="node-palette">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
            Nodes
          </p>
          <div className="flex flex-col gap-2">
            {(Object.keys(NODE_META) as NodeType[]).map((type) => (
              <PaletteItem key={type} type={type} />
            ))}
          </div>
        </Card>

        {/* Center: Canvas */}
        <Card
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-muted/20"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          data-testid="workflow-canvas"
          onClick={() => { if (!connecting) setSelected(null); }}
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
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
                onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
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
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-orange-100 border border-orange-300 text-orange-800 text-xs px-3 py-1.5 rounded-full shadow-sm pointer-events-none">
              Click a target node to connect
            </div>
          )}
        </Card>

        {/* Right: Properties panel */}
        <Card className="w-48 flex-shrink-0 p-3 overflow-y-auto" data-testid="properties-panel">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Properties
          </p>
          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Type</label>
                <p className={cn('text-xs font-semibold mt-0.5', NODE_META[selectedNode.type].color)}>
                  {NODE_META[selectedNode.type].label}
                </p>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Label</label>
                <input
                  value={selectedNode.label}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, label: e.target.value } : n
                      )
                    )
                  }
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
                onClick={deleteSelected}
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
      </div>
    </Layout>
  );
}

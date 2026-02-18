import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockGraphData, GraphNode } from '@/lib/mock-graph-data';
import { Search, BookOpen, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const SVG_W = 520,
  SVG_H = 380,
  CX = 260,
  CY = 195,
  R = 155;

const NODE_COLOR: Record<string, string> = {
  CONCEPT: '#3b82f6',
  PERSON: '#22c55e',
  SOURCE: '#a855f7',
  TERM: '#f97316',
};
const EDGE_COLOR: Record<string, string> = {
  CONTRADICTS: '#ef4444',
  PREREQUISITE_OF: '#3b82f6',
  RELATED_TO: '#94a3b8',
  MENTIONS: '#22c55e',
  CITES: '#a855f7',
};
const TYPE_LABEL: Record<string, string> = {
  CONCEPT: '💡',
  PERSON: '👤',
  SOURCE: '📚',
  TERM: '🏷️',
};

// ─── Static circular layout ───────────────────────────────────────────────────
function computePositions(nodes: GraphNode[]) {
  return Object.fromEntries(
    nodes.map((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      return [n.id, { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }];
    })
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function KnowledgeGraph() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string>('free-will');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const positions = useMemo(() => computePositions(mockGraphData.nodes), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.3, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('g[data-node]')) return;
    isPanning.current = true;
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: translate.x,
      ty: translate.y,
    };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setTranslate({
      x: panStart.current.tx + (e.clientX - panStart.current.x),
      y: panStart.current.ty + (e.clientY - panStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const selectedNode = mockGraphData.nodes.find((n) => n.id === selectedId);

  const connectedEdges = mockGraphData.edges.filter(
    (e) => e.source === selectedId || e.target === selectedId
  );
  const connectedIds = new Set(
    connectedEdges.flatMap((e) => [e.source, e.target])
  );

  const visibleNodes = mockGraphData.nodes.filter(
    (n) =>
      (!typeFilter || n.type === typeFilter) &&
      (!searchQuery ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>
            <p className="text-sm text-muted-foreground">
              Explore concepts, people, and sources from your learning materials
            </p>
          </div>
          <div className="flex gap-2">
            {(['CONCEPT', 'PERSON', 'SOURCE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                className={`px-2 py-1 rounded-full text-xs border flex items-center gap-1 transition-opacity
                  ${typeFilter === t ? 'opacity-100 ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                style={{ borderColor: NODE_COLOR[t], color: NODE_COLOR[t] }}
              >
                {TYPE_LABEL[t]} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* SVG Graph */}
          <Card className="col-span-12 lg:col-span-8">
            <CardContent className="p-2 relative">
              {/* Zoom controls */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.min(3, s * 1.2))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.max(0.3, s / 1.2))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={resetView}
                  title="Reset view"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full cursor-grab active:cursor-grabbing select-none"
                style={{ maxHeight: '420px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
              <g transform={`translate(${CX + translate.x},${CY + translate.y}) scale(${scale}) translate(${-CX},${-CY})`}>
                {/* Edges */}
                {mockGraphData.edges.map((e) => {
                  const from = positions[e.source];
                  const to = positions[e.target];
                  if (!from || !to) return null;
                  const isActive =
                    connectedIds.has(e.source) &&
                    connectedIds.has(e.target) &&
                    (e.source === selectedId || e.target === selectedId);
                  const dimmed =
                    !visibleIds.has(e.source) || !visibleIds.has(e.target);
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
                      strokeDasharray={
                        e.type === 'CONTRADICTS' ? '5,3' : undefined
                      }
                    />
                  );
                })}

                {/* Nodes */}
                {mockGraphData.nodes.map((n) => {
                  const pos = positions[n.id];
                  if (!pos) return null;
                  const isSelected = n.id === selectedId;
                  const isConnected = connectedIds.has(n.id);
                  const dimmed = !visibleIds.has(n.id);
                  const r = isSelected ? 18 : 13;
                  return (
                    <g
                      key={n.id}
                      data-node={n.id}
                      onClick={() => setSelectedId(n.id)}
                      style={{ cursor: 'pointer' }}
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
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={r}
                        fill={NODE_COLOR[n.type] ?? '#94a3b8'}
                        opacity={
                          dimmed
                            ? 0.2
                            : isSelected
                              ? 1
                              : isConnected
                                ? 0.9
                                : 0.6
                        }
                        stroke={isSelected ? '#1d4ed8' : 'white'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + r + 13}
                        textAnchor="middle"
                        fontSize={isSelected ? 10 : 9}
                        fontWeight={isSelected ? 700 : 400}
                        fill={dimmed ? '#cbd5e1' : '#1e293b'}
                      >
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
              </svg>

              {/* Edge legend */}
              <div className="flex flex-wrap gap-3 px-2 pb-2 text-xs text-muted-foreground">
                {Object.entries(EDGE_COLOR).map(([type, color]) => (
                  <span key={type} className="flex items-center gap-1">
                    <span
                      className="inline-block h-0.5 w-5"
                      style={{ backgroundColor: color }}
                    />
                    {type.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            {selectedNode && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">
                      {TYPE_LABEL[selectedNode.type]}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">
                        {selectedNode.label}
                      </p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${NODE_COLOR[selectedNode.type]}20`,
                          color: NODE_COLOR[selectedNode.type],
                        }}
                      >
                        {selectedNode.type}
                      </span>
                    </div>
                  </div>
                  {selectedNode.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedNode.description}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs h-7 justify-start"
                    onClick={() => navigate('/learn/content-1')}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    See in content <ChevronRight className="h-3 w-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  CONNECTIONS ({connectedEdges.length})
                </p>
                <div className="space-y-1.5">
                  {connectedEdges.map((e) => {
                    const otherId =
                      e.source === selectedId ? e.target : e.source;
                    const other = mockGraphData.nodes.find(
                      (n) => n.id === otherId
                    );
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelectedId(otherId)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              NODE_COLOR[other?.type ?? 'CONCEPT'],
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {other?.label}
                          </p>
                          <p
                            className="text-xs text-muted-foreground"
                            style={{ color: EDGE_COLOR[e.type] }}
                          >
                            {e.type.replace('_', ' ')}
                          </p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  GRAPH STATS
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <p className="text-lg font-bold">
                      {mockGraphData.nodes.length}
                    </p>
                    <p className="text-muted-foreground">Nodes</p>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <p className="text-lg font-bold">
                      {mockGraphData.edges.length}
                    </p>
                    <p className="text-muted-foreground">Edges</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

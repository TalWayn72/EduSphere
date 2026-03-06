import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  mockGraphData,
  GraphNode,
  GraphEdge,
  NodeType,
  EdgeType,
} from '@/lib/mock-graph-data';
import {
  GET_CONCEPTS_QUERY,
  GET_RELATED_CONCEPTS_QUERY,
  LEARNING_PATH_QUERY,
  RELATED_CONCEPTS_BY_NAME_QUERY,
} from '@/lib/graphql/knowledge.queries';
import {
  Search,
  BookOpen,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  RefreshCw,
  GitBranch,
  Network,
  User,
} from 'lucide-react';
import { DEV_MODE } from '@/lib/auth';
import { PersonalGraphView } from './PersonalGraphView';

// ─── Mock learning path used when DEV_MODE is true ───────────────────────────
const MOCK_LEARNING_PATH: ApiLearningPath = {
  steps: 4,
  concepts: [
    {
      id: 'mock-path-1',
      name: 'Introduction to Jewish Philosophy',
      type: 'CONCEPT',
    },
    {
      id: 'mock-path-2',
      name: 'Free Will in Medieval Philosophy',
      type: 'CONCEPT',
    },
    { id: 'mock-path-3', name: 'Maimonides on Providence', type: 'CONCEPT' },
    { id: 'mock-path-4', name: 'Contemporary Applications', type: 'CONCEPT' },
  ],
};

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

// ─── API response types ───────────────────────────────────────────────────────
interface ApiConcept {
  id: string;
  name: string;
  definition: string;
  sourceIds: string[];
}

interface ApiRelatedConcept {
  concept: { id: string; name: string; definition: string };
  strength: number;
}

interface ApiConceptNode {
  id: string;
  name: string;
  type?: string;
}

interface ApiLearningPath {
  concepts: ApiConceptNode[];
  steps: number;
}

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
export interface KnowledgeGraphProps {
  /** When provided, shows course-context breadcrumb and filters the graph */
  courseId?: string;
}

type ViewMode = 'global' | 'personal';

export function KnowledgeGraph({ courseId }: KnowledgeGraphProps = {}) {
  const { t } = useTranslation('knowledge');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Refresh / toast state
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const prevConceptCount = useRef<number | null>(null);

  // Learning Path state
  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathSearchTrigger, setPathSearchTrigger] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  // DEV_MODE mock path state — replaces the paused real query in development
  const [mockPathResult, setMockPathResult] = useState<ApiLearningPath | null>(
    null
  );
  const [mockPathLoading, setMockPathLoading] = useState(false);
  const mockPathTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Cleanup mock path timer on unmount
  useEffect(() => {
    return () => {
      if (mockPathTimerRef.current) clearTimeout(mockPathTimerRef.current);
    };
  }, []);

  // Dismiss toast after 4 s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ── Real: fetch all concepts ──
  const [conceptsResult] = useQuery<{ concepts: ApiConcept[] }>({
    query: GET_CONCEPTS_QUERY,
    variables: { limit: 50, _refresh: refreshKey },
    pause: DEV_MODE,
    requestPolicy: refreshKey > 0 ? 'network-only' : 'cache-first',
  } as Parameters<typeof useQuery>[0]);

  // ── Real: fetch related concepts for selected node ──
  const [relatedResult] = useQuery({
    query: GET_RELATED_CONCEPTS_QUERY,
    variables: { conceptId: selectedId ?? '', depth: 2, limit: 20 },
    pause: DEV_MODE || !selectedId,
  });

  // ── Learning Path query — fires only when user clicks "Find Path" (prod only) ──
  // In DEV_MODE the query stays paused; mock data is returned via mockPathResult instead.
  const [learningPathResult] = useQuery({
    query: LEARNING_PATH_QUERY,
    variables: {
      from: pathSearchTrigger?.from ?? '',
      to: pathSearchTrigger?.to ?? '',
    },
    pause: DEV_MODE || !pathSearchTrigger,
    requestPolicy: 'network-only',
  } as Parameters<typeof useQuery>[0]);

  // ── Related concepts by name for the selected node ──
  // selectedId is null before a node is clicked; selectedNodeName defaults to ''.
  // We resolve the label from the raw API data to avoid dependency on graphData (defined below).
  const selectedNodeName = DEV_MODE
    ? (mockGraphData.nodes.find((n) => n.id === selectedId)?.label ?? '')
    : (conceptsResult.data?.concepts?.find((c) => c.id === selectedId)?.name ??
      '');
  const [relatedByNameResult] = useQuery({
    query: RELATED_CONCEPTS_BY_NAME_QUERY,
    variables: { conceptName: selectedNodeName, depth: 2 },
    pause: DEV_MODE || !selectedNodeName,
  } as Parameters<typeof useQuery>[0]);

  // ── Build graph from real API data or fall back to mock ──
  const graphData = useMemo((): { nodes: GraphNode[]; edges: GraphEdge[] } => {
    if (
      DEV_MODE ||
      conceptsResult.error ||
      !conceptsResult.data?.concepts?.length
    ) {
      return mockGraphData;
    }

    const apiConcepts = conceptsResult.data.concepts;
    const nodes: GraphNode[] = apiConcepts.map((c) => ({
      id: c.id,
      label: c.name,
      type: 'CONCEPT' as NodeType,
      description: c.definition,
    }));

    const apiRelated: ApiRelatedConcept[] =
      relatedResult.data?.relatedConcepts ?? [];

    const edges: GraphEdge[] = apiRelated.map((r, idx) => ({
      id: `edge-${idx}`,
      source: selectedId ?? '',
      target: r.concept.id,
      type: 'RELATED_TO' as EdgeType,
    }));

    return { nodes, edges };
  }, [
    conceptsResult.data,
    conceptsResult.error,
    relatedResult.data,
    selectedId,
  ]);

  // Default selectedId to first node when data loads
  const effectiveSelectedId = selectedId ?? graphData.nodes[0]?.id ?? null;

  const positions = useMemo(
    () => computePositions(graphData.nodes),
    [graphData.nodes]
  );

  // Show toast when concept count increases after a manual refresh
  useEffect(() => {
    if (DEV_MODE || conceptsResult.fetching || !conceptsResult.data?.concepts)
      return;
    const current = conceptsResult.data.concepts.length;
    if (
      prevConceptCount.current !== null &&
      current > prevConceptCount.current
    ) {
      const added = current - prevConceptCount.current;
      setToast(
        `Graph updated with ${added} new concept${added === 1 ? '' : 's'}`
      );
    }
    prevConceptCount.current = current;
  }, [conceptsResult.data, conceptsResult.fetching]);

  // Log GraphQL errors so they are observable in devtools / CI logs
  useEffect(() => {
    if (conceptsResult.error) {
      console.error('[KnowledgeGraph] Concepts query error:', conceptsResult.error.message);
    }
  }, [conceptsResult.error]);

  useEffect(() => {
    if (learningPathResult.error) {
      console.error('[KnowledgeGraph] Learning path query error:', learningPathResult.error.message);
    }
  }, [learningPathResult.error]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ── Learning Path handlers ──
  const handleFindPath = useCallback(() => {
    const from = pathFrom.trim();
    const to = pathTo.trim();
    if (!from || !to) {
      setPathError('Both "From" and "To" concept names are required.');
      return;
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      setPathError('"From" and "To" must be different concepts.');
      return;
    }
    setPathError(null);
    setPathSearchTrigger({ from, to });

    if (DEV_MODE) {
      // Reset previous result and show a brief loading flash before returning mock data.
      setMockPathResult(null);
      setMockPathLoading(true);
      if (mockPathTimerRef.current) clearTimeout(mockPathTimerRef.current);
      mockPathTimerRef.current = setTimeout(() => {
        setMockPathLoading(false);
        setMockPathResult(MOCK_LEARNING_PATH);
      }, 600);
      return;
    }
  }, [pathFrom, pathTo]);

  // In DEV_MODE use the mock result; in production use the real query response.
  const learningPath: ApiLearningPath | null = DEV_MODE
    ? mockPathResult
    : ((
        learningPathResult.data as
          | { learningPath?: ApiLearningPath }
          | undefined
      )?.learningPath ?? null);
  const relatedByName: ApiConceptNode[] =
    (
      relatedByNameResult.data as
        | { relatedConceptsByName?: ApiConceptNode[] }
        | undefined
    )?.relatedConceptsByName ?? [];

  // IDs that are on the active learning path — used to highlight nodes
  const pathNodeIds = useMemo(
    () => new Set((learningPath?.concepts ?? []).map((c) => c.id)),
    [learningPath]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(3, Math.max(0.3, s * delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as SVGElement).closest('g[data-node]')) return;
      isPanning.current = true;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      };
    },
    [translate]
  );

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

  const selectedNode = graphData.nodes.find(
    (n) => n.id === effectiveSelectedId
  );
  const connectedEdges = graphData.edges.filter(
    (e) => e.source === effectiveSelectedId || e.target === effectiveSelectedId
  );
  const connectedIds = new Set(
    connectedEdges.flatMap((e) => [e.source, e.target])
  );

  const visibleNodes = graphData.nodes.filter(
    (n) =>
      (!typeFilter || n.type === typeFilter) &&
      (!searchQuery ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  const isLoading = !DEV_MODE && conceptsResult.fetching;

  return (
    <Layout>
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('loadingGraph')}
          </div>
        )}
        {!DEV_MODE && conceptsResult.error && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="graph-error-banner"
            className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2"
          >
            <span data-testid="graph-error-message">{t('networkUnavailable')}</span>
            <button
              onClick={handleRefresh}
              data-testid="graph-error-retry"
              className="underline hover:no-underline font-medium"
            >
              {t('retry')}
            </button>
          </div>
        )}
        {toast && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 w-fit">
            <RefreshCw className="h-3 w-3" />
            {toast}
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex gap-2" role="tablist" aria-label="Knowledge graph view">
          <button
            role="tab"
            aria-selected={viewMode === 'global'}
            onClick={() => setViewMode('global')}
            data-testid="kg-tab-global"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${viewMode === 'global'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Network className="h-3 w-3" />
            {courseId ? t('courseContext') : t('title')}
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'personal'}
            onClick={() => setViewMode('personal')}
            data-testid="kg-tab-personal"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
              ${viewMode === 'personal'
                ? 'bg-indigo-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <User className="h-3 w-3" />
            My Wiki
          </button>
        </div>

        {/* Personal graph view */}
        {viewMode === 'personal' && (
          <div>
            <div className="mb-2">
              <h1 className="text-2xl font-bold">Personal Knowledge Wiki</h1>
              <p className="text-sm text-muted-foreground">
                Your annotations across all courses, connected by shared concepts.
              </p>
            </div>
            <PersonalGraphView
              onViewCourse={(cId) => void navigate(`/courses/${cId}`)}
            />
          </div>
        )}

        {/* Header (global / course view only) */}
        {viewMode === 'global' && <div className="flex items-center justify-between">
          <div>
            {courseId ? (
              <>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {t('title')} &rsaquo;{' '}
                  <span data-testid="kg-course-context-badge" className="font-medium text-primary">
                    {t('courseContext')}
                  </span>
                </p>
                <h1 className="text-2xl font-bold">{t('courseContext')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('filteredBy', { course: courseId })}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
              </>
            )}
          </div>
          <div className="flex gap-2 items-center">
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
            {!DEV_MODE && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleRefresh}
                disabled={isLoading}
                title={t('refreshGraph')}
              >
                <RefreshCw
                  className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
                />
                {t('refresh')}
              </Button>
            )}
          </div>
        </div>}

        {viewMode === 'global' && (
        <>
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchConcepts')}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* SVG Graph */}
          <Card className="col-span-12 lg:col-span-8">
            <CardContent className="p-2 relative">
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.min(3, s * 1.2))}
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.max(0.3, s / 1.2))}
                  title="Zoom out"
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
                            dimmed
                              ? 0.2
                              : isSelected
                                ? 1
                                : isConnected
                                  ? 0.9
                                  : 0.6
                          }
                          stroke={
                            isOnPath
                              ? '#facc15'
                              : isSelected
                                ? '#1d4ed8'
                                : 'white'
                          }
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
                    {t('seeInContent')}{' '}
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t('connections')} ({connectedEdges.length})
                  {!DEV_MODE && relatedResult.fetching && (
                    <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                  )}
                </p>
                <div className="space-y-1.5">
                  {connectedEdges.map((e) => {
                    const otherId =
                      e.source === effectiveSelectedId ? e.target : e.source;
                    const other = graphData.nodes.find((n) => n.id === otherId);
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

            {/* Learning Path panel */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {t('learningPath')}
                </p>
                <div className="flex gap-1">
                  <input
                    value={pathFrom}
                    onChange={(e) => setPathFrom(e.target.value)}
                    placeholder={t('fromConcept')}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && handleFindPath()}
                  />
                  <span className="text-muted-foreground self-center text-xs">
                    →
                  </span>
                  <input
                    value={pathTo}
                    onChange={(e) => setPathTo(e.target.value)}
                    placeholder={t('toConcept')}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md bg-background"
                    onKeyDown={(e) => e.key === 'Enter' && handleFindPath()}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={handleFindPath}
                  disabled={
                    DEV_MODE ? mockPathLoading : learningPathResult.fetching
                  }
                >
                  {(
                    DEV_MODE ? mockPathLoading : learningPathResult.fetching
                  ) ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {t('finding')}
                    </>
                  ) : (
                    t('findPath')
                  )}
                </Button>

                {pathError && (
                  <p className="text-xs text-destructive">{pathError}</p>
                )}

                {!DEV_MODE && learningPathResult.error && (
                  <p
                    role="alert"
                    data-testid="path-error-banner"
                    className="text-xs text-destructive"
                  >
                    {t('pathError')}
                  </p>
                )}

                {pathSearchTrigger &&
                  !mockPathLoading &&
                  !learningPathResult.fetching &&
                  !learningPathResult.error &&
                  (learningPath ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {learningPath.steps} step
                        {learningPath.steps !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {learningPath.concepts.map((c, i) => (
                          <span key={c.id} className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedId(c.id)}
                              className="text-xs px-1.5 py-0.5 rounded border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-950 font-medium hover:bg-yellow-100 transition-colors"
                            >
                              {c.name}
                            </button>
                            {i < learningPath.concepts.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t('noPath')}
                    </p>
                  ))}
              </CardContent>
            </Card>

            {/* Related Concepts by name (COLLECT aggregation) */}
            {relatedByName.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Network className="h-3 w-3" />
                    RELATED TO "{selectedNodeName}" (depth 2)
                    {!DEV_MODE && relatedByNameResult.fetching && (
                      <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
                    )}
                  </p>
                  <div className="space-y-1">
                    {relatedByName.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className="w-full text-left flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-400" />
                        <p className="text-xs truncate">{c.name}</p>
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-auto" />
                      </button>
                    ))}
                    {relatedByName.length > 6 && (
                      <p className="text-xs text-muted-foreground pl-1">
                        +{relatedByName.length - 6} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t('graphStats')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <p className="text-lg font-bold">
                      {graphData.nodes.length}
                    </p>
                    <p className="text-muted-foreground">{t('nodes')}</p>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <p className="text-lg font-bold">
                      {graphData.edges.length}
                    </p>
                    <p className="text-muted-foreground">{t('edges')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </>
        )}
      </div>
    </Layout>
  );
}

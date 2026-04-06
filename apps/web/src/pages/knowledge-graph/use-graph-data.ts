import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from 'urql';
import type { CombinedError } from 'urql';
import {
  mockGraphData,
  type GraphNode,
  type GraphEdge,
  type NodeType,
  type EdgeType,
} from '@/lib/mock-graph-data';
import {
  GET_CONCEPTS_QUERY,
  GET_RELATED_CONCEPTS_QUERY,
  RELATED_CONCEPTS_BY_NAME_QUERY,
} from '@/lib/graphql/knowledge.queries';
import { DEV_MODE } from '@/lib/auth';
import type { ApiConcept, ApiRelatedConcept, ApiConceptNode } from './types';

/** Empty graph returned when real data is unavailable in production. */
const EMPTY_GRAPH: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [],
  edges: [],
};

/**
 * Classify a urql CombinedError into a category so the UI can show
 * an appropriate message instead of the generic "server not accessible".
 */
export type GraphErrorKind = 'network' | 'auth' | 'graphql' | null;

const AUTH_PATTERNS = [
  'unauthorized',
  'unauthenticated',
  'authentication required',
  'forbidden',
];

export function classifyGraphError(
  error: CombinedError | undefined
): GraphErrorKind {
  if (!error) return null;
  if (error.networkError) return 'network';
  const msg = error.message?.toLowerCase() ?? '';
  if (AUTH_PATTERNS.some((p) => msg.includes(p))) return 'auth';
  const hasAuthCode = error.graphQLErrors?.some((e) => {
    const code = String(
      (e.extensions as Record<string, unknown>)?.code ?? ''
    ).toUpperCase();
    return (
      code === 'UNAUTHENTICATED' ||
      code === 'UNAUTHORIZED' ||
      code === 'FORBIDDEN'
    );
  });
  if (hasAuthCode) return 'auth';
  if (error.graphQLErrors?.length) return 'graphql';
  return 'network';
}

export function useGraphData() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const prevConceptCount = useRef<number | null>(null);

  // Dismiss toast after 4 s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // ── Real: fetch all concepts ──
  // BUG-fix: `_refresh` is not a field in the concepts(limit: Int) schema argument
  // and causes "Cannot return null for non-nullable field" GraphQL errors because
  // the gateway rejects unknown variables. Cache busting is achieved through
  // requestPolicy: 'network-only' alone — no extra variable needed.
  const [conceptsResult] = useQuery<{ concepts: ApiConcept[] }>({
    query: GET_CONCEPTS_QUERY,
    variables: { limit: 50 },
    pause: DEV_MODE,
    requestPolicy: refreshKey > 0 ? 'network-only' : 'cache-first',
  } as Parameters<typeof useQuery>[0]);

  // ── Real: fetch related concepts for selected node ──
  const [relatedResult] = useQuery({
    query: GET_RELATED_CONCEPTS_QUERY,
    variables: { conceptId: selectedId ?? '', depth: 2, limit: 20 },
    pause: DEV_MODE || !selectedId,
  });

  // ── Related concepts by name for the selected node ──
  const selectedNodeName = DEV_MODE
    ? (mockGraphData.nodes.find((n) => n.id === selectedId)?.label ?? '')
    : (conceptsResult.data?.concepts?.find((c) => c.id === selectedId)?.name ??
      '');

  const [relatedByNameResult] = useQuery({
    query: RELATED_CONCEPTS_BY_NAME_QUERY,
    variables: { conceptName: selectedNodeName, depth: 2 },
    pause: DEV_MODE || !selectedNodeName,
  } as Parameters<typeof useQuery>[0]);

  // BUG-096: Classify the error so the UI can show context-specific messages
  // instead of the misleading "server not accessible" for auth/GraphQL errors.
  const errorKind = classifyGraphError(conceptsResult.error);

  // ── Build graph from real API data ──
  // DEV_MODE: always show mock data (no real backend).
  // Production with error: show EMPTY graph (not mock data!) so the UI
  // clearly indicates "no data" rather than showing fake nodes.
  // Production with empty result: show mock data as demo/placeholder.
  const graphData = useMemo((): { nodes: GraphNode[]; edges: GraphEdge[] } => {
    if (DEV_MODE) {
      return mockGraphData;
    }

    // BUG-096: On error, return empty graph instead of mock data.
    // Mock data in production is misleading — it makes the user think
    // the graph is real when it's not.
    if (conceptsResult.error) {
      return EMPTY_GRAPH;
    }

    // Still loading or no data yet — show empty graph (loading spinner visible)
    if (!conceptsResult.data?.concepts?.length) {
      // If the query finished (not fetching) but returned empty, show mock as demo
      if (!conceptsResult.fetching) {
        return mockGraphData;
      }
      return EMPTY_GRAPH;
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
    conceptsResult.fetching,
    relatedResult.data,
    selectedId,
  ]);

  // Default selectedId to first node when data loads
  const effectiveSelectedId = selectedId ?? graphData.nodes[0]?.id ?? null;

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
      console.error(
        '[KnowledgeGraph] Concepts query error:',
        conceptsResult.error.message
      );
    }
  }, [conceptsResult.error]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const relatedByName: ApiConceptNode[] =
    (
      relatedByNameResult.data as
        | { relatedConceptsByName?: ApiConceptNode[] }
        | undefined
    )?.relatedConceptsByName ?? [];

  const isLoading = !DEV_MODE && conceptsResult.fetching;

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

  return {
    graphData,
    selectedId,
    setSelectedId,
    effectiveSelectedId,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    toast,
    isLoading,
    errorKind,
    conceptsResult,
    relatedResult,
    relatedByNameResult,
    selectedNodeName,
    relatedByName,
    selectedNode,
    connectedEdges,
    connectedIds,
    visibleIds,
    handleRefresh,
  };
}

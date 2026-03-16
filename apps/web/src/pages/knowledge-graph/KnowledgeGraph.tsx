import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Loader2,
  RefreshCw,
  Network,
  User,
} from 'lucide-react';
import { DEV_MODE } from '@/lib/auth';
import { PersonalGraphView } from '../PersonalGraphView';
import { TYPE_LABEL, EDGE_COLOR, TYPE_FILTER_STYLE, computePositions } from './constants';
import { useGraphData } from './use-graph-data';
import { useGraphViewport } from './use-graph-viewport';
import { useLearningPath } from './use-learning-path';
import { GraphCanvas } from './GraphCanvas';
import { GraphControls } from './GraphControls';
import { GraphSidebar } from './GraphSidebar';
import type { KnowledgeGraphProps, ViewMode } from './types';

export function KnowledgeGraph({ courseId }: KnowledgeGraphProps = {}) {
  const { t } = useTranslation('knowledge');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('global');

  const graph = useGraphData();
  const viewport = useGraphViewport();
  const path = useLearningPath();

  const positions = useMemo(
    () => computePositions(graph.graphData.nodes),
    [graph.graphData.nodes]
  );

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title={t('knowledgeGraph', 'Knowledge Graph')}
          breadcrumbs={courseId ? [
            { label: 'Courses', href: '/courses' },
            { label: t('knowledgeGraph', 'Knowledge Graph') },
          ] : undefined}
        />
        {graph.isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('loadingGraph')}
          </div>
        )}
        {!DEV_MODE && graph.conceptsResult.error && (
          <div
            role="alert"
            aria-live="polite"
            data-testid="graph-error-banner"
            className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2"
          >
            <span data-testid="graph-error-message">{t('networkUnavailable')}</span>
            <button
              onClick={graph.handleRefresh}
              data-testid="graph-error-retry"
              className="underline hover:no-underline font-medium"
            >
              {t('retry')}
            </button>
          </div>
        )}
        {graph.toast && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 w-fit">
            <RefreshCw className="h-3 w-3" />
            {graph.toast}
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
            {(['CONCEPT', 'PERSON', 'SOURCE'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => graph.setTypeFilter(graph.typeFilter === tp ? null : tp)}
                className={`px-2 py-1 rounded-full text-xs border flex items-center gap-1 transition-opacity
                  ${graph.typeFilter === tp ? 'opacity-100 ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                style={TYPE_FILTER_STYLE[tp]}
              >
                {TYPE_LABEL[tp]} {tp}
              </button>
            ))}
            {!DEV_MODE && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={graph.handleRefresh}
                disabled={graph.isLoading}
                title={t('refreshGraph')}
              >
                <RefreshCw
                  className={`h-3 w-3 ${graph.isLoading ? 'animate-spin' : ''}`}
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
            value={graph.searchQuery}
            onChange={(e) => graph.setSearchQuery(e.target.value)}
            placeholder={t('searchConcepts')}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* SVG Graph */}
          <Card className="col-span-12 lg:col-span-8">
            <CardContent className="p-2 relative">
              <GraphControls
                onZoomIn={viewport.zoomIn}
                onZoomOut={viewport.zoomOut}
                onResetView={viewport.resetView}
              />
              <GraphCanvas
                svgRef={viewport.svgRef}
                scale={viewport.scale}
                translate={viewport.translate}
                graphData={graph.graphData}
                positions={positions}
                effectiveSelectedId={graph.effectiveSelectedId}
                connectedIds={graph.connectedIds}
                visibleIds={graph.visibleIds}
                pathNodeIds={path.pathNodeIds}
                onMouseDown={viewport.handleMouseDown}
                onMouseMove={viewport.handleMouseMove}
                onMouseUp={viewport.handleMouseUp}
                onSelectNode={graph.setSelectedId}
              />
              <EdgeLegend />

            </CardContent>
          </Card>

          {/* Sidebar */}
          <GraphSidebar
            selectedNode={graph.selectedNode}
            effectiveSelectedId={graph.effectiveSelectedId}
            connectedEdges={graph.connectedEdges}
            graphData={graph.graphData}
            relatedFetching={graph.relatedResult.fetching}
            relatedByName={graph.relatedByName}
            relatedByNameFetching={graph.relatedByNameResult.fetching}
            selectedNodeName={graph.selectedNodeName}
            onSelectNode={graph.setSelectedId}
            pathFrom={path.pathFrom}
            setPathFrom={path.setPathFrom}
            pathTo={path.pathTo}
            setPathTo={path.setPathTo}
            pathSearchTrigger={path.pathSearchTrigger}
            pathError={path.pathError}
            learningPath={path.learningPath}
            learningPathError={!!path.learningPathResult.error}
            isPathLoading={path.isPathLoading}
            mockPathLoading={path.mockPathLoading}
            onFindPath={path.handleFindPath}
          />
        </div>
        </>
        )}
      </div>
    </Layout>
  );
}

/** Pre-computed edge legend styles to avoid inline objects in render loop. */
const EDGE_LEGEND_STYLES: Record<string, React.CSSProperties> = Object.fromEntries(
  Object.entries(EDGE_COLOR).map(([type, color]) => [type, { backgroundColor: color }]),
);

const EdgeLegend = React.memo(function EdgeLegend() {
  return (
    <div className="flex flex-wrap gap-3 px-2 pb-2 text-xs text-muted-foreground">
      {Object.entries(EDGE_COLOR).map(([type]) => (
        <span key={type} className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5" style={EDGE_LEGEND_STYLES[type]} />
          {type.replace('_', ' ')}
        </span>
      ))}
    </div>
  );
});

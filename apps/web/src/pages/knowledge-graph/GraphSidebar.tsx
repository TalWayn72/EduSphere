import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Network,
} from 'lucide-react';
import { DEV_MODE } from '@/lib/auth';
import type { GraphNode, GraphEdge } from '@/lib/mock-graph-data';
import type { ApiConceptNode } from './types';
import { NODE_COLOR, EDGE_COLOR, TYPE_LABEL } from './constants';
import { LearningPathPanel } from './LearningPathPanel';
import type { ApiLearningPath } from './types';

interface GraphSidebarProps {
  selectedNode: GraphNode | undefined;
  effectiveSelectedId: string | null;
  connectedEdges: GraphEdge[];
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
  relatedFetching: boolean;
  relatedByName: ApiConceptNode[];
  relatedByNameFetching: boolean;
  selectedNodeName: string;
  onSelectNode: (id: string) => void;
  // Learning path props
  pathFrom: string;
  setPathFrom: (v: string) => void;
  pathTo: string;
  setPathTo: (v: string) => void;
  pathSearchTrigger: { from: string; to: string } | null;
  pathError: string | null;
  learningPath: ApiLearningPath | null;
  learningPathError: boolean;
  isPathLoading: boolean;
  mockPathLoading: boolean;
  onFindPath: () => void;
}

export const GraphSidebar = React.memo(function GraphSidebar({
  selectedNode,
  effectiveSelectedId,
  connectedEdges,
  graphData,
  relatedFetching,
  relatedByName,
  relatedByNameFetching,
  selectedNodeName,
  onSelectNode,
  pathFrom,
  setPathFrom,
  pathTo,
  setPathTo,
  pathSearchTrigger,
  pathError,
  learningPath,
  learningPathError,
  isPathLoading,
  mockPathLoading,
  onFindPath,
}: GraphSidebarProps) {
  const { t } = useTranslation('knowledge');
  const navigate = useNavigate();

  const selectedNodeBadgeStyle = useMemo(
    () => selectedNode ? {
      backgroundColor: `${NODE_COLOR[selectedNode.type]}20`,
      color: NODE_COLOR[selectedNode.type],
    } : undefined,
    [selectedNode],
  );

  return (
    <div className="col-span-12 lg:col-span-4 space-y-3">
      {/* Selected node details */}
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
                  style={selectedNodeBadgeStyle}
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
              onClick={() => navigate('/learn/b0000000-0000-0000-0000-000000000001')}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              {t('seeInContent')}{' '}
              <ChevronRight className="h-3 w-3 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connections */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {t('connections')} ({connectedEdges.length})
            {!DEV_MODE && relatedFetching && (
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
                  onClick={() => onSelectNode(otherId)}
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
      <LearningPathPanel
        pathFrom={pathFrom}
        setPathFrom={setPathFrom}
        pathTo={pathTo}
        setPathTo={setPathTo}
        pathSearchTrigger={pathSearchTrigger}
        pathError={pathError}
        learningPath={learningPath}
        learningPathError={learningPathError}
        isPathLoading={isPathLoading}
        mockPathLoading={mockPathLoading}
        onFindPath={onFindPath}
        onSelectNode={onSelectNode}
      />

      {/* Related Concepts by name */}
      {relatedByName.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Network className="h-3 w-3" />
              RELATED TO &quot;{selectedNodeName}&quot; (depth 2)
              {!DEV_MODE && relatedByNameFetching && (
                <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />
              )}
            </p>
            <div className="space-y-1">
              {relatedByName.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectNode(c.id)}
                  className="w-full text-left flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0 bg-blue-400 dark:bg-blue-500" />
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

      {/* Graph stats */}
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
  );
});

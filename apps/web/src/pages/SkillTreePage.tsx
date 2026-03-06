/**
 * SkillTreePage — visual skill tree connected to real Apache AGE knowledge graph data.
 *
 * Route: /courses/:courseId/skill-tree
 * Fetches skillTree query from subgraph-knowledge.
 * Falls back to SAMPLE_SKILL_TREE_DATA when query errors or returns empty.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import {
  KnowledgeSkillTree,
  SAMPLE_SKILL_TREE_DATA,
} from '@/components/KnowledgeSkillTree';
import type { SkillNode, MasteryLevel } from '@/components/KnowledgeSkillTree';
import { GET_SKILL_TREE_QUERY, UPDATE_MASTERY_LEVEL_MUTATION } from '@/lib/graphql/knowledge.queries';
import { Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── GraphQL response types ────────────────────────────────────────────────

interface ApiSkillTreeNode {
  id: string;
  label: string;
  type: string;
  masteryLevel: string;
  connections: string[];
}

interface ApiSkillTree {
  skillTree: {
    nodes: ApiSkillTreeNode[];
    edges: { source: string; target: string }[];
  };
}

// ─── Mastery level mapping (backend enum → frontend literal) ──────────────

const MASTERY_MAP: Record<string, MasteryLevel> = {
  NONE: 'none',
  ATTEMPTED: 'attempted',
  FAMILIAR: 'familiar',
  PROFICIENT: 'proficient',
  MASTERED: 'mastered',
};

const REVERSE_MASTERY_MAP: Record<MasteryLevel, string> = {
  none: 'NONE',
  attempted: 'ATTEMPTED',
  familiar: 'FAMILIAR',
  proficient: 'PROFICIENT',
  mastered: 'MASTERED',
};

const MASTERY_ORDER: MasteryLevel[] = [
  'none',
  'attempted',
  'familiar',
  'proficient',
  'mastered',
];

function nextMastery(current: MasteryLevel): MasteryLevel {
  const idx = MASTERY_ORDER.indexOf(current);
  return MASTERY_ORDER[Math.min(idx + 1, MASTERY_ORDER.length - 1)] ?? current;
}

function mapApiNodes(
  apiNodes: ApiSkillTreeNode[],
  localOverrides: Map<string, MasteryLevel>
): SkillNode[] {
  const allIds = new Set(apiNodes.map((n) => n.id));
  return apiNodes.map((n) => ({
    id: n.id,
    label: n.label,
    mastery: localOverrides.get(n.id) ?? (MASTERY_MAP[n.masteryLevel] ?? 'none'),
    progress: masteryToProgress(
      localOverrides.get(n.id) ?? (MASTERY_MAP[n.masteryLevel] ?? 'none')
    ),
    children: n.connections.filter((id) => allIds.has(id)),
    // Unlock first node + any node whose parent has mastery >= 'familiar'
    unlocked: true,
  }));
}

function masteryToProgress(level: MasteryLevel): number {
  const map: Record<MasteryLevel, number> = {
    none: 0,
    attempted: 20,
    familiar: 60,
    proficient: 80,
    mastered: 100,
  };
  return map[level] ?? 0;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SkillTreePage() {
  const { courseId = 'all' } = useParams<{ courseId?: string }>();
  const [mounted, setMounted] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Local overrides applied optimistically before server confirmation
  const [masteryOverrides, setMasteryOverrides] = useState<
    Map<string, MasteryLevel>
  >(new Map());

  // Mounted guard — prevents urql graphcache dispatch during sibling render
  useEffect(() => {
    setMounted(true);
  }, []);

  const [skillTreeResult] = useQuery<ApiSkillTree>({
    query: GET_SKILL_TREE_QUERY,
    variables: { courseId },
    pause: !mounted,
  });

  const [updateResult, updateMastery] = useMutation(UPDATE_MASTERY_LEVEL_MUTATION);

  const apiNodes = skillTreeResult.data?.skillTree?.nodes ?? [];
  const hasData = apiNodes.length > 0;
  const isError = !!skillTreeResult.error;

  // Map API nodes → SkillNode[] or fall back to sample data
  const nodes: SkillNode[] = hasData
    ? mapApiNodes(apiNodes, masteryOverrides)
    : SAMPLE_SKILL_TREE_DATA;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleAdvanceMastery = async () => {
    if (!selectedNodeId || !hasData) return;
    const current = masteryOverrides.get(selectedNodeId)
      ?? (MASTERY_MAP[
          apiNodes.find((n) => n.id === selectedNodeId)?.masteryLevel ?? 'NONE'
        ] ?? 'none');
    const next = nextMastery(current as MasteryLevel);

    // Optimistic update
    setMasteryOverrides((prev) => {
      const updated = new Map(prev);
      updated.set(selectedNodeId, next);
      return updated;
    });

    const result = await updateMastery({
      nodeId: selectedNodeId,
      level: REVERSE_MASTERY_MAP[next],
    });

    if (result.error) {
      // Revert on failure
      console.error(
        '[SkillTreePage] updateMasteryLevel failed:',
        result.error.message
      );
      setMasteryOverrides((prev) => {
        const reverted = new Map(prev);
        reverted.delete(selectedNodeId);
        return reverted;
      });
    }
  };

  const isSampleData = !hasData;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold flex items-center gap-2"
              data-testid="skill-tree-page-title"
            >
              <Network className="h-6 w-6 text-indigo-500" />
              Skill Tree
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSampleData
                ? 'Sample data — connect to live API for real knowledge graph'
                : `Course: ${courseId}`}
            </p>
          </div>

          {/* Selected node actions */}
          {selectedNode && hasData && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-sm"
              data-testid="skill-tree-node-actions"
            >
              <div>
                <p className="text-xs font-semibold">{selectedNode.label}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Mastery: {selectedNode.mastery}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleAdvanceMastery}
                disabled={
                  selectedNode.mastery === 'mastered' || updateResult.fetching
                }
                data-testid="advance-mastery-btn"
              >
                {updateResult.fetching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Advance Mastery'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {skillTreeResult.fetching && (
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground"
            data-testid="skill-tree-loading"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading skill tree...
          </div>
        )}

        {/* Error banner */}
        {isError && (
          <div
            role="alert"
            aria-live="polite"
            className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2"
            data-testid="skill-tree-error"
          >
            Could not load live data — showing sample skill tree.
          </div>
        )}

        {/* Mutation error */}
        {updateResult.error && (
          <div
            role="alert"
            aria-live="polite"
            className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2"
            data-testid="mastery-update-error"
          >
            Failed to update mastery level. Changes have been reverted.
          </div>
        )}

        {/* Sample data notice */}
        {isSampleData && !skillTreeResult.fetching && (
          <div
            className="text-xs text-muted-foreground bg-muted/40 border border-muted rounded px-3 py-2"
            data-testid="skill-tree-sample-notice"
          >
            Showing sample skill tree data. Enroll in a course to see your
            personalized knowledge graph.
          </div>
        )}

        {/* Skill tree */}
        <div className="min-h-[500px]">
          <KnowledgeSkillTree
            nodes={nodes}
            onNodeClick={handleNodeClick}
            className="min-h-[500px]"
            data-testid="skill-tree-canvas"
          />
        </div>
      </div>
    </Layout>
  );
}

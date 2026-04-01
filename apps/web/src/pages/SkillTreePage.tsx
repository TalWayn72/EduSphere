/**
 * SkillTreePage — visual skill tree connected to real Apache AGE knowledge graph data.
 *
 * Route: /courses/:courseId/skill-tree
 * Fetches skillTree query from subgraph-knowledge.
 * Falls back to SAMPLE_SKILL_TREE_DATA when query errors or returns empty.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import {
  KnowledgeSkillTree,
  SAMPLE_SKILL_TREE_DATA,
} from '@/components/KnowledgeSkillTree';
import type { MasteryLevel } from '@/components/KnowledgeSkillTree';
import {
  GET_SKILL_TREE_QUERY,
  UPDATE_MASTERY_LEVEL_MUTATION,
} from '@/lib/graphql/knowledge.queries';
import { Loader2, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApiSkillTree } from './SkillTreePage.helpers';
import {
  MASTERY_MAP,
  REVERSE_MASTERY_MAP,
  nextMastery,
  mapApiNodes,
  isValidCourseId,
} from './SkillTreePage.helpers';

export function SkillTreePage() {
  const { t } = useTranslation('knowledge');
  const { courseId = 'all' } = useParams<{ courseId?: string }>();
  const [mounted, setMounted] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [masteryOverrides, setMasteryOverrides] = useState<
    Map<string, MasteryLevel>
  >(new Map());

  const validId = isValidCourseId(courseId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [skillTreeResult] = useQuery<ApiSkillTree>({
    query: GET_SKILL_TREE_QUERY,
    variables: { courseId },
    pause: !mounted || !validId,
  });

  const [updateResult, updateMastery] = useMutation(
    UPDATE_MASTERY_LEVEL_MUTATION
  );

  const apiNodes = skillTreeResult.data?.skillTree?.nodes ?? [];
  const hasData = apiNodes.length > 0;
  const isError = !!skillTreeResult.error;

  const nodes = hasData
    ? mapApiNodes(apiNodes, masteryOverrides)
    : SAMPLE_SKILL_TREE_DATA;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleAdvanceMastery = async () => {
    if (!selectedNodeId || !hasData) return;
    const current =
      masteryOverrides.get(selectedNodeId) ??
      MASTERY_MAP[
        apiNodes.find((n) => n.id === selectedNodeId)?.masteryLevel ?? 'NONE'
      ] ??
      'none';
    const next = nextMastery(current as MasteryLevel);

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

  if (!validId) {
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center min-h-[300px] gap-3"
          data-testid="skill-tree-invalid-id"
          role="alert"
        >
          <p className="text-lg font-semibold text-destructive">
            {t('skillTree.invalidId')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('skillTree.invalidIdDesc', { courseId })}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold flex items-center gap-2"
              data-testid="skill-tree-page-title"
            >
              <Network className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
              {t('skillTree.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSampleData
                ? t('skillTree.sampleData')
                : t('skillTree.courseLabel', { courseId })}
            </p>
          </div>

          {selectedNode && hasData && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-sm"
              data-testid="skill-tree-node-actions"
            >
              <div>
                <p className="text-xs font-semibold">{selectedNode.label}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {t('skillTree.mastery')}: {selectedNode.mastery}
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
                  t('skillTree.advanceMastery')
                )}
              </Button>
            </div>
          )}
        </div>

        {skillTreeResult.fetching && (
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground"
            data-testid="skill-tree-loading"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('skillTree.loading')}
          </div>
        )}

        {isError && (
          <div
            role="alert"
            aria-live="polite"
            className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 dark:text-amber-300 dark:bg-amber-950 dark:border-amber-700"
            data-testid="skill-tree-error"
          >
            {t('skillTree.loadError')}
          </div>
        )}

        {updateResult.error && (
          <div
            role="alert"
            aria-live="polite"
            className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2"
            data-testid="mastery-update-error"
          >
            {t('skillTree.updateError')}
          </div>
        )}

        {isSampleData && !skillTreeResult.fetching && (
          <div
            className="text-xs text-muted-foreground bg-muted/40 border border-muted rounded px-3 py-2"
            data-testid="skill-tree-sample-notice"
          >
            {t('skillTree.sampleNotice')}
          </div>
        )}

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

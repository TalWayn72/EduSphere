/**
 * useScenarioNode — fetches a SCENARIO content node by its content item ID.
 *
 * Returns null when the content item is not a SCENARIO type or is still loading.
 */
import { useQuery } from 'urql';
import { SCENARIO_NODE_QUERY } from '@/lib/graphql/content-tier3.queries';

interface ScenarioChoiceItem {
  id: string;
  text: string;
  nextContentItemId: string | null;
}

export interface ScenarioNodeData {
  id: string;
  title: string;
  description: string;
  choices: ScenarioChoiceItem[];
  isEndNode: boolean;
  endingType?: string;
}

interface ScenarioNodeResult {
  scenarioNode?: ScenarioNodeData | null;
}

export interface UseScenarioNodeResult {
  scenarioNode: ScenarioNodeData | null;
  fetching: boolean;
  error: string | null;
}

export function useScenarioNode(
  contentItemId: string,
  enabled = true
): UseScenarioNodeResult {
  const [result] = useQuery<ScenarioNodeResult>({
    query: SCENARIO_NODE_QUERY,
    variables: { contentItemId },
    pause: !enabled,
  });

  return {
    scenarioNode: result.data?.scenarioNode ?? null,
    fetching: result.fetching,
    error: result.error?.message ?? null,
  };
}

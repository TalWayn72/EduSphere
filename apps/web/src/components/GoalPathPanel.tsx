/**
 * GoalPathPanel — renders the learning path steps for a single competency goal.
 * Kept separate from CompetencyGoalWidget to respect 150-line guideline.
 */
import { useQuery } from 'urql';
import { CheckCircle2, Circle } from 'lucide-react';
import { MY_LEARNING_PATH_QUERY } from '@/lib/graphql/competency.queries';

interface CompetencyGoal {
  id: string;
  targetConceptName: string;
}

interface AutoPathNode {
  conceptName: string;
  isCompleted: boolean;
}

interface AutoPath {
  targetConceptName: string;
  nodes: AutoPathNode[];
  totalSteps: number;
  completedSteps: number;
}

export function GoalPathPanel({ goal }: { goal: CompetencyGoal }) {
  const [{ data, fetching }] = useQuery<{ myLearningPath: AutoPath | null }>({
    query: MY_LEARNING_PATH_QUERY,
    variables: { targetConceptName: goal.targetConceptName },
  });

  const path = data?.myLearningPath;
  if (fetching)
    return (
      <p className="text-xs text-muted-foreground mt-1">Loading path...</p>
    );
  if (!path)
    return <p className="text-xs text-muted-foreground mt-1">No path found</p>;

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-muted-foreground">
        {path.completedSteps}/{path.totalSteps} steps completed
      </p>
      <div className="flex flex-wrap gap-1">
        {path.nodes.map((node) => (
          <span
            key={node.conceptName}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
              node.isCompleted
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {node.isCompleted ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            {node.conceptName}
          </span>
        ))}
      </div>
    </div>
  );
}

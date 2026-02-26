import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { Link } from 'react-router-dom';
import { Brain, PlusCircle, Trash2, Target } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MY_COMPETENCY_GOALS_QUERY,
  ADD_COMPETENCY_GOAL_MUTATION,
  REMOVE_COMPETENCY_GOAL_MUTATION,
} from '@/lib/graphql/competency.queries';
import { GoalPathPanel } from '@/components/GoalPathPanel';

interface CompetencyGoal {
  id: string;
  targetConceptName: string;
  targetLevel: string | null;
  createdAt: string;
}

export function CompetencyGoalWidget() {
  const [open, setOpen] = useState(false);
  const [conceptName, setConceptName] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [{ data, fetching }] = useQuery<{
    myCompetencyGoals: CompetencyGoal[];
  }>({
    query: MY_COMPETENCY_GOALS_QUERY,
  });

  const [, addGoal] = useMutation(ADD_COMPETENCY_GOAL_MUTATION);
  const [, removeGoal] = useMutation(REMOVE_COMPETENCY_GOAL_MUTATION);

  const goals = data?.myCompetencyGoals ?? [];

  const handleAdd = async () => {
    if (!conceptName.trim()) return;
    await addGoal({ targetConceptName: conceptName.trim(), targetLevel: null });
    setConceptName('');
    setOpen(false);
  };

  const handleRemove = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeGoal({ goalId });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              My Learning Path
            </CardTitle>
            <CardDescription className="mt-1">
              Track skill goals and auto-generated learning paths
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Goal
          </Button>
        </CardHeader>
        <CardContent>
          {fetching && (
            <p className="text-sm text-muted-foreground">Loading goals...</p>
          )}
          {!fetching && goals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No goals yet. Add a concept to get your learning path.
            </p>
          )}
          <ul className="space-y-3">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="border rounded-md p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() =>
                  setExpanded(expanded === goal.id ? null : goal.id)
                }
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <Brain className="h-4 w-4 text-primary" />
                    {goal.targetConceptName}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={(e) => handleRemove(goal.id, e)}
                    aria-label={`Remove goal ${goal.targetConceptName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {expanded === goal.id && <GoalPathPanel goal={goal} />}
              </li>
            ))}
          </ul>
          {goals.length > 0 && (
            <Link
              to="/knowledge"
              className="mt-3 inline-flex text-xs text-primary hover:underline"
            >
              Explore full Knowledge Graph →
            </Link>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Learning Goal</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. Machine Learning, Graph Theory…"
              value={conceptName}
              onChange={(e) => setConceptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!conceptName.trim()}>
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

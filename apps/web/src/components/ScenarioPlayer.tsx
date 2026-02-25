/**
 * ScenarioPlayer — F-009 Branching Scenario-Based Learning
 *
 * Renders a choose-your-own-adventure interface for SCENARIO-type content items.
 * The learner reads narrative text and selects one of 2-4 choices that navigate
 * them through a branching content graph.
 *
 * Uses urql for GraphQL queries/mutations.
 */
import { useState, useEffect } from 'react';
import { useMutation } from 'urql';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { RECORD_SCENARIO_CHOICE_MUTATION } from '@/lib/graphql/content.queries';

interface ScenarioChoiceItem {
  id: string;
  text: string;
  nextContentItemId: string | null;
}

interface ScenarioNodeData {
  id: string;
  title: string;
  description: string;
  choices: ScenarioChoiceItem[];
  isEndNode: boolean;
  endingType?: string;
}

interface ScenarioPlayerProps {
  rootContentItemId: string;
  initialNode: ScenarioNodeData;
}

const ENDING_ICONS: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="h-8 w-8 text-green-500" />,
  FAILURE: <XCircle className="h-8 w-8 text-red-500" />,
  NEUTRAL: <MinusCircle className="h-8 w-8 text-gray-400" />,
};

const ENDING_LABELS: Record<string, string> = {
  SUCCESS: 'Congratulations! You completed this path successfully.',
  FAILURE: 'This path did not lead to the best outcome. Try again?',
  NEUTRAL: 'You have reached the end of this scenario branch.',
};

const ENDING_COLORS: Record<string, string> = {
  SUCCESS: 'border-green-200 bg-green-50',
  FAILURE: 'border-red-200 bg-red-50',
  NEUTRAL: 'border-gray-200 bg-gray-50',
};

export function ScenarioPlayer({ rootContentItemId, initialNode }: ScenarioPlayerProps) {
  const [currentNode, setCurrentNode] = useState<ScenarioNodeData>(initialNode);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([initialNode.title]);
  const [isComplete, setIsComplete] = useState(initialNode.isEndNode);

  const [, recordChoice] = useMutation(RECORD_SCENARIO_CHOICE_MUTATION);

  // Sync when a new initialNode is passed in (e.g., re-mount with different content)
  useEffect(() => {
    setCurrentNode(initialNode);
    setBreadcrumb([initialNode.title]);
    setIsComplete(initialNode.isEndNode);
  }, [initialNode]);

  const handleChoiceClick = async (choice: ScenarioChoiceItem) => {
    const result = await recordChoice({
      fromContentItemId: currentNode.id,
      choiceId: choice.id,
      scenarioRootId: rootContentItemId,
    });
    if (result.error) return;
    const nextNode = result.data?.recordScenarioChoice as ScenarioNodeData | null;
    if (!nextNode) {
      setIsComplete(true);
      return;
    }
    setCurrentNode(nextNode);
    setBreadcrumb((prev) => [...prev, nextNode.title]);
    if (nextNode.isEndNode) setIsComplete(true);
  };

  const handleRestart = () => {
    setCurrentNode(initialNode);
    setBreadcrumb([initialNode.title]);
    setIsComplete(initialNode.isEndNode);
  };

  if (isComplete) {
    const endingType = currentNode.endingType ?? 'NEUTRAL';
    return (
      <Card className={`border-2 ${ENDING_COLORS[endingType] ?? ENDING_COLORS.NEUTRAL}`}>
        <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
          {ENDING_ICONS[endingType] ?? ENDING_ICONS.NEUTRAL}
          <h2 className="text-xl font-bold">{currentNode.title}</h2>
          <p className="text-muted-foreground">{currentNode.description}</p>
          <p className="text-sm font-medium">{ENDING_LABELS[endingType]}</p>
          <Button variant="outline" onClick={handleRestart} className="mt-2 gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header: title + breadcrumb */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{currentNode.title}</h2>
          <nav aria-label="Scenario path" className="flex flex-wrap gap-1 mt-1">
            {breadcrumb.map((step, i) => (
              <span key={i} className="text-xs text-muted-foreground">
                {i > 0 && <span className="mx-1">{'>'}</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : ''}>
                  {step}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Narrative description */}
        <div className="px-6 py-6">
          <p className="text-base leading-relaxed">{currentNode.description}</p>
        </div>

        {/* Choices */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          {currentNode.choices.map((choice) => (
            <Button
              key={choice.id}
              variant="outline"
              className="w-full text-left justify-start h-auto py-3 px-4 whitespace-normal"
              onClick={() => void handleChoiceClick(choice)}
            >
              {choice.text}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

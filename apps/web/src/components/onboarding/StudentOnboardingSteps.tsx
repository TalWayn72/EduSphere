import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  UPDATE_ONBOARDING_STEP_MUTATION,
  COMPLETE_ONBOARDING_MUTATION,
} from '@/lib/graphql/onboarding.queries';

const TOPIC_CATEGORIES = [
  'Torah Study', 'Talmud', 'Halacha', 'Jewish History', 'Hebrew Language',
  'Kabbalah', 'Jewish Philosophy', 'Prayer', 'Lifecycle Events', 'Ethics',
  'Contemporary Issues', 'Israel Studies',
];

interface StudentOnboardingStepsProps {
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function StudentOnboardingSteps({ currentStep, onComplete, onSkip }: StudentOnboardingStepsProps) {
  const [step, setStep] = useState(currentStep);
  const [displayName, setDisplayName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [, updateStep] = useMutation(UPDATE_ONBOARDING_STEP_MUTATION);
  const [, completeOnboarding] = useMutation(COMPLETE_ONBOARDING_MUTATION);

  const totalSteps = 5;
  const progress = ((step - 1) / totalSteps) * 100;

  const handleNext = async () => {
    await updateStep({ input: { step, data: { displayName, selectedTopics } } });
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await completeOnboarding({});
      onComplete();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground text-center">Step {step} of {totalSteps}</p>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Welcome! Let&apos;s set up your profile</h2>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What topics interest you?</h2>
          <div className="grid grid-cols-2 gap-3">
            {TOPIC_CATEGORIES.map((topic) => (
              <label key={topic} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedTopics.includes(topic)}
                  onCheckedChange={(checked) => {
                    setSelectedTopics(checked
                      ? [...selectedTopics, topic]
                      : selectedTopics.filter((t) => t !== topic));
                  }}
                />
                <span className="text-sm">{topic}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">What&apos;s your knowledge level?</h2>
          <p className="text-muted-foreground text-sm">
            We&apos;ll use this to recommend the right courses for you.
          </p>
          <div className="space-y-3">
            {(['Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
              <Button
                key={level}
                variant="outline"
                className="w-full justify-start"
                onClick={async () => {
                  await updateStep({ input: { step, data: { knowledgeLevel: level } } });
                  setStep(step + 1);
                }}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your personalized recommendations</h2>
          <p className="text-muted-foreground text-sm">
            Based on your interests, we&apos;ve selected these courses for you.
          </p>
          <div className="rounded-lg border p-4 bg-indigo-50 dark:bg-indigo-950/20">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Your courses are ready! Click Continue to see them on your dashboard.
            </p>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
          <p className="text-muted-foreground">
            Your learning journey begins now. Explore courses, earn XP, and track your progress.
          </p>
        </div>
      )}

      {step !== 3 && (
        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onSkip}>Skip for now</Button>
          <Button onClick={handleNext}>
            {step === totalSteps ? 'Go to Dashboard' : 'Continue'}
          </Button>
        </div>
      )}
    </div>
  );
}

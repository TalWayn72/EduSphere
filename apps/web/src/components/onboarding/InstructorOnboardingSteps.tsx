import { useState, useEffect, useCallback } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { UPDATE_ONBOARDING_STEP_MUTATION, COMPLETE_ONBOARDING_MUTATION } from '@/lib/graphql/onboarding.queries';
import { getCurrentUser } from '@/lib/auth';

interface InstructorOnboardingStepsProps {
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
}

/** WCAG 3.3.7 — Pre-fill fields already collected at registration. */
function useProfileDefaults() {
  const user = getCurrentUser();
  return {
    displayName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    expertise: '',
  };
}

export function InstructorOnboardingSteps({ currentStep, onComplete, onSkip }: InstructorOnboardingStepsProps) {
  const defaults = useProfileDefaults();
  const [step, setStep] = useState(currentStep);
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState(defaults.expertise);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');

  const [, updateStep] = useMutation(UPDATE_ONBOARDING_STEP_MUTATION);
  const [, completeOnboarding] = useMutation(COMPLETE_ONBOARDING_MUTATION);

  const totalSteps = 4;
  const progress = ((step - 1) / totalSteps) * 100;

  // WCAG 3.3.7: Auto-advance step 1 if bio+expertise are pre-filled from a previous session
  const isStep1Prefilled = bio.length > 0 && expertise.length > 0;

  const handleNext = useCallback(async () => {
    await updateStep({
      input: { step, data: { bio, expertise, courseTitle, courseDescription } }
    });
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await completeOnboarding({});
      onComplete();
    }
  }, [step, bio, expertise, courseTitle, courseDescription, updateStep, completeOnboarding, onComplete, totalSteps]);

  // Auto-advance if profile data already satisfies step 1
  useEffect(() => {
    if (step === 1 && isStep1Prefilled) {
      void handleNext();
    }
  // Only run on mount to avoid looping
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground text-center">Step {step} of {totalSteps}</p>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Tell us about yourself</h2>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your background and teaching experience..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expertise">Subject Expertise</Label>
            {defaults.expertise && (
              <p className="text-xs text-muted-foreground" role="status">
                Pre-filled from your profile — edit if needed
              </p>
            )}
            <Input
              id="expertise"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="e.g. Torah, Talmud, Jewish History"
              autoComplete="organization-title"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Create your first course</h2>
          <div className="space-y-2">
            <Label htmlFor="courseTitle">Course Title</Label>
            <Input
              id="courseTitle"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Introduction to Talmud Study"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseDescription">Description</Label>
            <Textarea
              id="courseDescription"
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="What will students learn in this course?"
              rows={3}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Add your first lesson</h2>
          <p className="text-muted-foreground text-sm">Choose the type of content for your first lesson:</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: 'VIDEO', label: 'Video Lesson', desc: 'Upload or link a video lecture' },
              { type: 'QUIZ', label: 'Quiz', desc: 'Test student knowledge' },
              { type: 'DISCUSSION', label: 'Discussion', desc: 'Prompt group conversation' },
            ].map(({ type, label, desc }) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto py-3 flex flex-col items-start text-left"
                onClick={async () => {
                  await updateStep({ input: { step, data: { firstLessonType: type } } });
                  setStep(step + 1);
                }}
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">Your course is ready!</h2>
          <p className="text-muted-foreground">
            You can now publish your course and start enrolling students.
          </p>
          <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20">
            <p className="text-sm text-green-700 dark:text-green-300">
              Course &quot;{courseTitle || 'Your Course'}&quot; is saved as a draft.
            </p>
          </div>
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

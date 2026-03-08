import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentOnboardingSteps } from '@/components/onboarding/StudentOnboardingSteps';
import { InstructorOnboardingSteps } from '@/components/onboarding/InstructorOnboardingSteps';
import {
  MY_ONBOARDING_STATE_QUERY,
  SKIP_ONBOARDING_MUTATION,
} from '@/lib/graphql/onboarding.queries';

export function OnboardingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const navigate = useNavigate();

  const [{ data, fetching }] = useQuery({
    query: MY_ONBOARDING_STATE_QUERY,
    pause: !mounted,
  });

  const [, skipOnboarding] = useMutation(SKIP_ONBOARDING_MUTATION);

  const state = data?.myOnboardingState;

  useEffect(() => {
    if (state?.completed || state?.skipped) {
      void navigate('/');
    }
  }, [state, navigate]);

  const handleComplete = () => void navigate('/');
  const handleSkip = async () => {
    await skipOnboarding({});
    void navigate('/');
  };

  if (fetching || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-xl space-y-4 p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
      <div className="w-full max-w-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Welcome to EduSphere</h1>
          <p className="text-muted-foreground mt-2">Let&apos;s personalize your learning experience</p>
        </div>

        {state?.role === 'INSTRUCTOR' ? (
          <InstructorOnboardingSteps
            currentStep={state?.currentStep ?? 1}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ) : (
          <StudentOnboardingSteps
            currentStep={state?.currentStep ?? 1}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  );
}

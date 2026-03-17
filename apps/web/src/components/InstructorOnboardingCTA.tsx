/**
 * InstructorOnboardingCTA — "Create Your First Course with AI" card.
 * Shown only for INSTRUCTOR role users with 0 courses.
 */
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface InstructorOnboardingCTAProps {
  /** Number of courses the current user owns. */
  courseCount: number;
  /** Current user's role (e.g. 'INSTRUCTOR', 'STUDENT'). */
  userRole: string;
}

export function InstructorOnboardingCTA({ courseCount, userRole }: InstructorOnboardingCTAProps) {
  const { t } = useTranslation('dashboard');

  if (userRole !== 'INSTRUCTOR' || courseCount > 0) {
    return null;
  }

  return (
    <Card data-testid="instructor-onboarding-cta" className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('instructorCta.title', 'Create Your First Course with AI')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          {t(
            'instructorCta.description',
            'Let our AI assistant help you build an engaging course in minutes.'
          )}
        </p>
        <Button asChild>
          <a href="/courses/create" data-testid="instructor-cta-button">
            {t('instructorCta.button', 'Get Started')}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

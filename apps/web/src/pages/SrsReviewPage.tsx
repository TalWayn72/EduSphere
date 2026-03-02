import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { getCurrentUser } from '@/lib/auth';
import { useSrsSession } from '@/hooks/useSrsSession';

const RATINGS: {
  label: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  variant: 'destructive' | 'outline' | 'default' | 'secondary';
}[] = [
  { label: 'Again', quality: 0, variant: 'destructive' },
  { label: 'Hard', quality: 2, variant: 'outline' },
  { label: 'Good', quality: 3, variant: 'default' },
  { label: 'Easy', quality: 5, variant: 'secondary' },
];

export function SrsReviewPage() {
  const { t } = useTranslation('srs');
  const user = getCurrentUser();
  const {
    currentCard,
    totalDue,
    fetching,
    error,
    submitRating,
    sessionComplete,
    stats,
  } = useSrsSession(user?.id);
  const [flipped, setFlipped] = useState(false);

  const handleRating = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    setFlipped(false);
    submitRating(quality);
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <p className="text-muted-foreground" data-testid="loading-text">
            {t('loading', 'Loading cards...')}
          </p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center py-32 gap-4"
          data-testid="error-state"
        >
          <p className="text-destructive font-medium">
            {t('errorLoading', 'Failed to load review cards')}
          </p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              {t('backToDashboard', 'Back to Dashboard')}
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (sessionComplete) {
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center py-32 gap-6"
          data-testid="session-complete"
        >
          <h1
            className="text-3xl font-bold"
            data-testid="session-complete-title"
          >
            {t('sessionComplete', 'Session Complete!')}
          </h1>
          <div className="flex gap-8 text-lg">
            <span data-testid="correct-count">
              {t('correct', 'Correct')}: <strong>{stats.correct}</strong>
            </span>
            <span data-testid="incorrect-count">
              {t('incorrect', 'Incorrect')}: <strong>{stats.incorrect}</strong>
            </span>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              {t('backToDashboard', 'Back to Dashboard')}
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (totalDue === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p
            className="text-muted-foreground text-lg"
            data-testid="no-cards-due"
          >
            {t('noCardsDue', 'No cards due')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              'noCardsDueHint',
              'Great job! Check back later or explore courses to generate new review cards.'
            )}
          </p>
          <Button asChild variant="outline">
            <Link to="/courses">{t('browseCourses', 'Browse Courses')}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-16 gap-8 max-w-lg mx-auto">
        <p
          className="text-sm text-muted-foreground"
          data-testid="card-progress"
        >
          {`Card 1 of ${totalDue}`}
        </p>

        {/* Flashcard with flip animation */}
        <div
          className="relative w-full h-64 cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          aria-label={t('flipCard', 'Flip card')}
          data-testid="flashcard"
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-xl border bg-card p-6"
              style={{ backfaceVisibility: 'hidden' }}
              data-testid="card-front"
            >
              <h2
                className="text-2xl font-semibold text-center"
                data-testid="concept-name"
              >
                {currentCard?.conceptName}
              </h2>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border bg-card p-6 gap-3"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              data-testid="card-back"
            >
              <p className="text-sm text-muted-foreground">
                {t('interval', 'Interval')}:{' '}
                <strong>{currentCard?.intervalDays}d</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('easeFactor', 'Ease')}:{' '}
                <strong>{currentCard?.easeFactor?.toFixed(2)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Rating buttons — shown only after flip */}
        {flipped && (
          <div className="flex gap-3" data-testid="rating-buttons">
            {RATINGS.map(({ label, quality, variant }) => (
              <Button
                key={quality}
                variant={variant}
                onClick={() => handleRating(quality)}
                data-testid={`rate-${label.toLowerCase()}`}
              >
                {t(`rate${label}`, label)}
              </Button>
            ))}
          </div>
        )}

        {!flipped && (
          <Button
            variant="outline"
            onClick={() => setFlipped(true)}
            data-testid="flip-button"
          >
            {t('showAnswer', 'Show Answer')}
          </Button>
        )}
      </div>
    </Layout>
  );
}

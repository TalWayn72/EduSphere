import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
      data-testid="not-found-page"
    >
      <div className="rounded-full bg-muted p-6">
        <FileQuestion
          className="h-16 w-16 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('notFound.title')}
        </h1>
        <p className="text-muted-foreground max-w-md">
          {t('notFound.description')}
        </p>
      </div>
      <Button
        onClick={() => navigate('/dashboard')}
        variant="default"
        size="lg"
      >
        {t('notFound.backToDashboard')}
      </Button>
    </main>
  );
}

export default NotFoundPage;

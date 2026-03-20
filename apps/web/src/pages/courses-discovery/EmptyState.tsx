import { useTranslation } from 'react-i18next';

export function EmptyState({ query }: { query: string }) {
  const { t } = useTranslation('courses');
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center"
      data-testid="courses-empty-state"
    >
      <div className="rounded-full bg-muted p-6">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">
          {t('noCoursesFound')}
        </p>
        {query && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('noResultsForQuery', { query })}
          </p>
        )}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

export function ErrorBanner() {
  const { t } = useTranslation('courses');
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center"
      data-testid="courses-error-banner"
      role="alert"
    >
      <p className="text-lg font-semibold text-destructive">
        {t('unableToLoadCourses')}
      </p>
    </div>
  );
}

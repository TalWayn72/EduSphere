import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { AiCourseCreatorModal } from '@/components/AiCourseCreatorModal';
import { OfflineBanner } from './OfflineBanner';
import { CourseFilters } from './CourseFilters';
import { CourseGrid } from './CourseGrid';
import { useCourseListData } from './useCourseListData';

export function CourseList() {
  const { t } = useTranslation('courses');
  const navigate = useNavigate();

  const {
    isInstructor,
    fetching,
    error,
    reexecuteCourses,
    search,
    setSearch,
    sort,
    setSort,
    activeTab,
    setActiveTab,
    toast,
    aiModalOpen,
    setAiModalOpen,
    enrolledCourseIds,
    filteredCourses,
    handleEnroll,
    togglePublish,
    isPublished,
  } = useCourseListData();

  return (
    <Layout>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}

      <div className="space-y-6">
        {error && (
          <OfflineBanner
            onRetry={() =>
              reexecuteCourses({ requestPolicy: 'network-only' })
            }
          />
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('title')}
            </h1>
            <p className="text-muted-foreground">{t('exploreCollection')}</p>
          </div>
          {isInstructor && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setAiModalOpen(true)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {t('aiCreator.aiCreateCourse')}
              </Button>
              <Button
                onClick={() => navigate('/courses/new')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('newCourse')}
              </Button>
            </div>
          )}
        </div>

        <CourseFilters
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isInstructor={isInstructor}
        />

        <CourseGrid
          courses={filteredCourses}
          fetching={fetching}
          isInstructor={isInstructor}
          enrolledCourseIds={enrolledCourseIds}
          isPublished={isPublished}
          onEnroll={handleEnroll}
          onTogglePublish={togglePublish}
        />
      </div>
      <AiCourseCreatorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </Layout>
  );
}

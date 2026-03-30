import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Download } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { AiCourseCreatorModal } from '@/components/AiCourseCreatorModal';
import { CourseWizardStep1 } from './CourseWizardStep1';
import { PageShell } from '@/components/PageShell';
import { DRAFT_COURSE_ID } from './CourseCreatePage.types';
import { useCourseCreate } from './useCourseCreate';

// Re-export for backward compatibility
export { courseSchema, type CourseSchemaValues } from './CourseCreatePage.types';

const CourseWizardStep2 = lazy(() =>
  import('./CourseWizardStep2').then((m) => ({ default: m.CourseWizardStep2 }))
);
const CourseWizardMediaStep = lazy(() =>
  import('./CourseWizardMediaStep').then((m) => ({
    default: m.CourseWizardMediaStep,
  }))
);
const CourseWizardStep3 = lazy(() =>
  import('./CourseWizardStep3').then((m) => ({ default: m.CourseWizardStep3 }))
);

const LazyFallback = (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

export function CourseCreatePage() {
  const { t } = useTranslation('courses');
  const {
    step,
    setStep,
    form,
    wizardData,
    currentData,
    updateWizard,
    showAiModal,
    setShowAiModal,
    isSubmitting,
    isExporting,
    handleExportScorm,
    handleNextFromStep1,
    handlePublish,
    canAdvanceStep1,
    navigate,
  } = useCourseCreate();

  const STEPS = [
    { label: t('wizard.step1Label'), description: t('wizard.step1Description') },
    { label: t('wizard.step2Label'), description: t('wizard.step2Description') },
    { label: t('wizard.mediaLabel'), description: t('wizard.mediaDescription') },
    { label: t('wizard.publishLabel'), description: t('wizard.publishDescription') },
  ];

  const lastContentStep = STEPS.length - 2;

  return (
    <Layout>
      <PageShell size="sm">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('title')}
          </Button>
          <h1 className="text-2xl font-bold">{t('createCourse')}</h1>
        </div>

        {/* Step indicator */}
        <StepIndicator steps={STEPS} currentStep={step} />

        {/* Step content */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{STEPS[step]?.label}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step]?.description}</p>
          </div>

          {step === 0 && (
            <>
              <AiBuilderCta t={t} onLaunch={() => setShowAiModal(true)} />
              <AiCourseCreatorModal open={showAiModal} onClose={() => setShowAiModal(false)} />
            </>
          )}

          <Form {...form}>
            {step === 0 && <CourseWizardStep1 control={form.control} />}
          </Form>
          <Suspense fallback={LazyFallback}>
            {step === 1 && (
              <CourseWizardStep2 modules={wizardData.modules} onChange={updateWizard} />
            )}
            {step === 2 && (
              <CourseWizardMediaStep
                courseId={DRAFT_COURSE_ID}
                mediaList={wizardData.mediaList}
                onChange={updateWizard}
              />
            )}
            {step === 3 && (
              <CourseWizardStep3
                data={currentData}
                onPublish={handlePublish}
                isSubmitting={isSubmitting}
              />
            )}
          </Suspense>
        </Card>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('wizard.back')}
            </Button>
            <Button
              onClick={step === 0 ? handleNextFromStep1 : () => setStep((s) => s + 1)}
              disabled={step === 0 && !canAdvanceStep1}
            >
              {t('wizard.next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
        {step === STEPS.length - 1 && (
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setStep(lastContentStep)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('wizard.backToMedia')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportScorm}
              disabled={isExporting}
              data-testid="export-scorm-btn"
              className="border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 dark:border-indigo-400/40 dark:text-indigo-300"
            >
              {isExporting ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400 mr-2 inline-block dark:border-indigo-500" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export as SCORM 2004
            </Button>
          </div>
        )}
      </PageShell>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: { label: string; description: string }[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                i < currentStep
                  ? 'bg-primary border-primary text-primary-foreground'
                  : i === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
              }`}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="text-center hidden sm:block">
              <p className={`text-xs font-medium ${i === currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 transition-colors ${i < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function AiBuilderCta({ t, onLaunch }: { t: (key: string) => string; onLaunch: () => void }) {
  return (
    <div
      data-testid="ai-builder-cta"
      className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 dark:border-indigo-400/30 dark:bg-indigo-400/10"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{'\u2728'}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-indigo-300 dark:text-indigo-400">
            {t('aiCreator.builderTitle')}
          </h3>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {t('aiCreator.builderDescription')}
          </p>
        </div>
        <Button
          data-testid="launch-ai-builder-btn"
          onClick={onLaunch}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500"
        >
          {t('aiCreator.launchAiBuilder')}
        </Button>
      </div>
    </div>
  );
}

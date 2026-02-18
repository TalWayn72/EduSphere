import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CourseWizardStep1 } from './CourseWizardStep1';
import { CourseWizardStep2 } from './CourseWizardStep2';
import { CourseWizardStep3 } from './CourseWizardStep3';
import { DEFAULT_FORM, type CourseFormData } from './course-create.types';

const STEPS = [
  { label: 'Course Info', description: 'Title, description, difficulty' },
  { label: 'Modules', description: 'Add and order course modules' },
  { label: 'Publish', description: 'Review and publish' },
];

export function CourseCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CourseFormData>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (updates: Partial<CourseFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handlePublish = (publish: boolean) => {
    setIsSubmitting(true);
    // In production: call createCourse GraphQL mutation
    // For now: simulate async and navigate back
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/courses', {
        state: {
          newCourse: { ...form, published: publish },
          message: publish
            ? `"${form.title}" has been published!`
            : `"${form.title}" saved as draft.`,
        },
      });
    }, 800);
  };

  const canAdvance = step === 0 ? !!form.title.trim() : true;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Courses
          </Button>
          <h1 className="text-2xl font-bold">Create New Course</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    i < step
                      ? 'bg-primary border-primary text-primary-foreground'
                      : i === step
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="text-center hidden sm:block">
                  <p className={`text-xs font-medium ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    i < step ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{STEPS[step]?.label}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step]?.description}</p>
          </div>

          {step === 0 && <CourseWizardStep1 data={form} onChange={update} />}
          {step === 1 && <CourseWizardStep2 modules={form.modules} onChange={update} />}
          {step === 2 && (
            <CourseWizardStep3 data={form} onPublish={handlePublish} isSubmitting={isSubmitting} />
          )}
        </Card>

        {/* Navigation buttons (steps 0 and 1 only) */}
        {step < 2 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modules
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

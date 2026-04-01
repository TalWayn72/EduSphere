/**
 * OrgSignupWizard — 3-step wizard with horizontal stepper + live preview.
 * Route: /signup/org (public)
 */
import React, { useState, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PublicLayout } from '@/components/PublicLayout';
import { PageShell } from '@/components/PageShell';
import { AccountStep } from './steps/AccountStep';
import { OrgDetailsStep } from './steps/OrgDetailsStep';
import { BrandingStep } from './steps/BrandingStep';
import { StepIndicator } from './StepIndicator';
import {
  orgSignupSchema,
  stepSchemas,
  type OrgSignupFormData,
} from './OrgSignupWizard.schema';

const CREATE_ORG_MUTATION = `
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      tenantId
      slug
      redirectUrl
    }
  }
`;

const STEPS = ['account', 'organization', 'branding'] as const;

export function OrgSignupWizard() {
  const { t } = useTranslation('orgOnboarding');
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [, executeMutation] = useMutation(CREATE_ORG_MUTATION);

  const methods = useForm<OrgSignupFormData>({
    resolver: zodResolver(orgSignupSchema),
    mode: 'onTouched',
    defaultValues: {
      tosAccepted: false as unknown as true,
      gdprConsent: false,
      primaryColor: '#2563eb',
    },
  });

  const handleNext = useCallback(async () => {
    const schema = stepSchemas[step as 0 | 1 | 2];
    if (!schema) return;
    const values = methods.getValues();
    const result = schema.safeParse(values);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof OrgSignupFormData;
        methods.setError(path, { message: issue.message });
      });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [step, methods]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const onSubmit = useCallback(
    async (data: OrgSignupFormData) => {
      setServerError(null);
      const result = await executeMutation({
        input: {
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          password: data.password,
          orgName: data.orgName,
          slug: data.slug,
          orgType: data.orgType,
          orgSize: data.orgSize,
          primaryColor: data.primaryColor,
          tagline: data.tagline,
          tosAccepted: data.tosAccepted,
          gdprConsent: data.gdprConsent,
        },
      });
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      const redirectUrl = result.data?.createOrganization?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate('/login');
      }
    },
    [executeMutation, navigate]
  );

  const isLastStep = step === STEPS.length - 1;

  return (
    <PublicLayout navVariant="minimal" showFooter={false}>
      <div
        data-testid="org-signup-wizard"
        className="min-h-screen bg-gradient-to-br from-primary/5 to-background py-12"
      >
        <PageShell size="md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">{t('wizard.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('wizard.subtitle')}</p>
          </div>

          <StepIndicator current={step} total={STEPS.length} />

          <Card>
            <CardContent className="p-6 sm:p-8">
              <FormProvider {...methods}>
                <form
                  onSubmit={methods.handleSubmit(onSubmit)}
                  noValidate
                  aria-label={t('wizard.formLabel')}
                >
                  {step === 0 && <AccountStep />}
                  {step === 1 && <OrgDetailsStep />}
                  {step === 2 && <BrandingStep />}

                  {serverError && (
                    <div
                      className="mt-4 p-3 rounded bg-destructive/10 text-destructive text-sm"
                      role="alert"
                    >
                      {serverError}
                    </div>
                  )}

                  <div className="flex justify-between mt-8">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleBack}
                      disabled={step === 0}
                    >
                      {t('wizard.back')}
                    </Button>

                    {isLastStep ? (
                      <Button
                        type="submit"
                        disabled={methods.formState.isSubmitting}
                      >
                        {methods.formState.isSubmitting
                          ? t('wizard.creating')
                          : t('wizard.create')}
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleNext}>
                        {t('wizard.next')}
                      </Button>
                    )}
                  </div>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </PageShell>
      </div>
    </PublicLayout>
  );
}

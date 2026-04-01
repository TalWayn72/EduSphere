/**
 * PartnerSignupPage — Public B2B partner program application form.
 * Route: /partners (no auth required)
 */
import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PublicLayout } from '@/components/PublicLayout';
import { PageShell } from '@/components/PageShell';

const REQUEST_PARTNER = `
  mutation RequestPartner($input: PartnerRequestInput!) {
    requestPartner(input: $input) {
      status
      message
      requestId
    }
  }
`;

const schema = z.object({
  organizationName: z.string().min(2).max(200),
  partnerType: z.enum([
    'TRAINING_COMPANY',
    'CONTENT_CREATOR',
    'RESELLER',
    'SYSTEM_INTEGRATOR',
  ]),
  contactEmail: z.string().email().max(255),
  contactName: z.string().min(2).max(200),
  description: z.string().min(20).max(2000),
  expectedLearners: z.number().int().min(1),
});

type FormData = z.infer<typeof schema>;

const PARTNER_TYPE_DESCRIPTIONS: Record<string, string> = {
  TRAINING_COMPANY: 'Deliver corporate training on white-label EduSphere',
  CONTENT_CREATOR: 'Publish courses in EduSphere marketplace',
  RESELLER: 'Sell EduSphere to institutions (20% commission)',
  SYSTEM_INTEGRATOR: 'Deploy & customize EduSphere for enterprise clients',
};

export function PartnerSignupPage() {
  usePageTitle('Become a Partner');
  const [success, setSuccess] = useState(false);
  const [{ fetching, error }, executeMutation] = useMutation(REQUEST_PARTNER);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: 'onChange' });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await executeMutation({ input: data });
    if (!result.error) setSuccess(true);
  };

  return (
    <PublicLayout navVariant="minimal">
      <div
        data-testid="partner-signup-page"
        className="min-h-screen bg-gradient-to-br from-indigo-900 to-slate-900"
      >
        <PageShell size="sm" className="max-w-3xl py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white dark:text-white">
              Become an EduSphere Partner
            </h1>
            <p className="mt-3 text-indigo-100 dark:text-indigo-300">
              Join our growing network of partners and grow together.
            </p>
          </div>

          {/* Revenue Share Info Card */}
          <div className="bg-indigo-600/30 border border-indigo-400/40 rounded-xl p-5 mb-6 text-center dark:bg-indigo-400/30 dark:border-indigo-500/40">
            <p className="text-2xl font-bold text-white dark:text-white">
              30% Revenue Share
            </p>
            <p className="text-indigo-100 mt-1 dark:text-indigo-300">
              70% goes to you as a partner
            </p>
          </div>

          {/* Partner Type Descriptions */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {Object.entries(PARTNER_TYPE_DESCRIPTIONS).map(([type, desc]) => (
              <div
                key={type}
                className="bg-white/10 border border-white/20 rounded-lg p-4"
              >
                <p className="text-white text-sm font-semibold mb-1 dark:text-white">
                  {type.replace(/_/g, ' ')}
                </p>
                <p className="text-indigo-100 text-xs dark:text-indigo-300">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8">
            {success ? (
              <div
                data-testid="partner-success-message"
                className="text-center py-8"
                role="status"
                aria-live="polite"
              >
                <p className="text-4xl mb-4">✅</p>
                <h2 className="text-2xl font-bold text-white mb-2 dark:text-white">
                  Application Received!
                </h2>
                <p className="text-indigo-100 dark:text-indigo-300">
                  Application received! We'll review and respond within 3
                  business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="organizationName"
                      className="text-white text-sm font-medium dark:text-white"
                    >
                      Organization Name *
                    </Label>
                    <Input
                      id="organizationName"
                      {...register('organizationName')}
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 dark:text-white"
                      placeholder="Acme Corp"
                      aria-required="true"
                    />
                    {errors.organizationName && (
                      <p
                        className="text-red-300 text-xs mt-1 dark:text-red-400"
                        role="alert"
                      >
                        {errors.organizationName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="partnerType"
                      className="text-white text-sm font-medium dark:text-white"
                    >
                      Partner Type *
                    </Label>
                    <Select
                      onValueChange={(v) =>
                        setValue('partnerType', v as FormData['partnerType'], {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      aria-required="true"
                    >
                      <SelectTrigger
                        id="partnerType"
                        className="mt-1.5 bg-white/10 border-white/20 text-white dark:text-white"
                      >
                        <SelectValue placeholder="Select partner type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRAINING_COMPANY">
                          Training Company
                        </SelectItem>
                        <SelectItem value="CONTENT_CREATOR">
                          Content Creator
                        </SelectItem>
                        <SelectItem value="RESELLER">Reseller</SelectItem>
                        <SelectItem value="SYSTEM_INTEGRATOR">
                          System Integrator
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.partnerType && (
                      <p
                        className="text-red-300 text-xs mt-1 dark:text-red-400"
                        role="alert"
                      >
                        {errors.partnerType.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="contactName"
                        className="text-white text-sm font-medium dark:text-white"
                      >
                        Contact Name *
                      </Label>
                      <Input
                        id="contactName"
                        {...register('contactName')}
                        className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 dark:text-white"
                        placeholder="Jane Smith"
                        aria-required="true"
                      />
                      {errors.contactName && (
                        <p
                          className="text-red-300 text-xs mt-1 dark:text-red-400"
                          role="alert"
                        >
                          {errors.contactName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor="contactEmail"
                        className="text-white text-sm font-medium dark:text-white"
                      >
                        Email *
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        {...register('contactEmail')}
                        className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 dark:text-white"
                        placeholder="jane@company.com"
                        aria-required="true"
                      />
                      {errors.contactEmail && (
                        <p
                          className="text-red-300 text-xs mt-1 dark:text-red-400"
                          role="alert"
                        >
                          {errors.contactEmail.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="expectedLearners"
                      className="text-white text-sm font-medium dark:text-white"
                    >
                      Expected Learners *
                    </Label>
                    <Input
                      id="expectedLearners"
                      type="number"
                      min={1}
                      {...register('expectedLearners', { valueAsNumber: true })}
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 dark:text-white"
                      placeholder="1000"
                      aria-required="true"
                    />
                    {errors.expectedLearners && (
                      <p
                        className="text-red-300 text-xs mt-1 dark:text-red-400"
                        role="alert"
                      >
                        {errors.expectedLearners.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-white text-sm font-medium dark:text-white"
                    >
                      Describe Your Use Case *
                    </Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 min-h-[80px] dark:text-white"
                      placeholder="Tell us about your plans..."
                      aria-required="true"
                    />
                    {errors.description && (
                      <p
                        className="text-red-300 text-xs mt-1 dark:text-red-400"
                        role="alert"
                      >
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {error && (
                    <p
                      data-testid="partner-error-message"
                      className="text-red-300 text-sm text-center dark:text-red-400"
                      role="alert"
                    >
                      Something went wrong. Please try again.
                    </p>
                  )}

                  <Button
                    data-testid="partner-submit-btn"
                    type="submit"
                    disabled={fetching || !isValid}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 dark:bg-indigo-500 dark:text-white"
                  >
                    {fetching ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-700"
                          aria-hidden="true"
                        />
                        Submitting...
                      </span>
                    ) : (
                      'Apply to Partner Program'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </PageShell>
      </div>
    </PublicLayout>
  );
}

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const SUBMIT_PILOT_MUTATION = `
  mutation SubmitPilotRequest($input: PilotRequestInput!) {
    submitPilotRequest(input: $input) { id }
  }
`;

const OrgTypeEnum = z.enum(['UNIVERSITY', 'COLLEGE', 'CORPORATE', 'GOVERNMENT', 'DEFENSE']);

const schema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  orgType: OrgTypeEnum,
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  estimatedUsers: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 1, { message: 'Required' }),
  useCase: z.string().min(10, 'Please describe your use case (min 10 chars)'),
});

type FormData = z.infer<typeof schema>;

const BENEFIT_KEYS = ['benefit1', 'benefit2', 'benefit3', 'benefit4', 'benefit5'];

export function PilotCTASection() {
  const { t } = useTranslation('common');
  const [submitted, setSubmitted] = useState(false);
  const [, executeMutation] = useMutation(SUBMIT_PILOT_MUTATION);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    await executeMutation({ input: data });
    setSubmitted(true);
  };

  return (
    <section
      id="pilot-cta"
      data-testid="pilot-cta-section"
      className="bg-gradient-to-br from-indigo-900 to-slate-900 py-20 text-white"
      aria-label="Start your 90-day pilot"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t('landing.pilotCta.title')}
          </h2>
          <p className="mt-4 text-indigo-100 text-lg max-w-2xl mx-auto">
            {t('landing.pilotCta.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Form */}
          <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8">
            {submitted ? (
              <div className="text-center py-8" role="status" aria-live="polite">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Check className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t('landing.pilotCta.applicationReceived')}</h3>
                <p className="text-indigo-100">{t('landing.pilotCta.respondWithin24h')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Pilot application form">
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="orgName" className="text-white text-sm font-medium">{t('landing.pilotCta.orgName')}</Label>
                    <Input id="orgName" {...register('orgName')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80" placeholder={t('landing.pilotCta.orgNamePlaceholder')} aria-required="true" />
                    {errors.orgName && <p className="text-red-300 text-xs mt-1" role="alert">{errors.orgName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="orgType" className="text-white text-sm font-medium">{t('landing.pilotCta.orgType')}</Label>
                    <Select onValueChange={(v) => setValue('orgType', v as FormData['orgType'])} aria-required="true">
                      <SelectTrigger id="orgType" className="mt-1.5 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder={t('landing.pilotCta.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIVERSITY">{t('landing.pilotCta.orgTypeUniversity')}</SelectItem>
                        <SelectItem value="COLLEGE">{t('landing.pilotCta.orgTypeCollege')}</SelectItem>
                        <SelectItem value="CORPORATE">{t('landing.pilotCta.orgTypeCorporate')}</SelectItem>
                        <SelectItem value="GOVERNMENT">{t('landing.pilotCta.orgTypeGovernment')}</SelectItem>
                        <SelectItem value="DEFENSE">{t('landing.pilotCta.orgTypeDefense')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.orgType && <p className="text-red-300 text-xs mt-1" role="alert">{errors.orgType.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName" className="text-white text-sm font-medium">{t('landing.pilotCta.contactName')}</Label>
                      <Input id="contactName" {...register('contactName')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80" placeholder={t('landing.pilotCta.contactNamePlaceholder')} aria-required="true" />
                      {errors.contactName && <p className="text-red-300 text-xs mt-1" role="alert">{errors.contactName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-white text-sm font-medium">{t('landing.pilotCta.emailLabel')}</Label>
                      <Input id="email" type="email" {...register('email')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80" placeholder={t('landing.pilotCta.emailPlaceholder')} aria-required="true" />
                      {errors.email && <p className="text-red-300 text-xs mt-1" role="alert">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-white text-sm font-medium">{t('landing.pilotCta.phone')}</Label>
                      <Input id="phone" {...register('phone')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80" placeholder={t('landing.pilotCta.phonePlaceholder')} />
                    </div>
                    <div>
                      <Label htmlFor="estimatedUsers" className="text-white text-sm font-medium">{t('landing.pilotCta.estimatedUsers')}</Label>
                      <Input id="estimatedUsers" type="number" {...register('estimatedUsers')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80" placeholder={t('landing.pilotCta.estimatedUsersPlaceholder')} aria-required="true" />
                      {errors.estimatedUsers && <p className="text-red-300 text-xs mt-1" role="alert">{errors.estimatedUsers.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="useCase" className="text-white text-sm font-medium">{t('landing.pilotCta.useCase')}</Label>
                    <Textarea id="useCase" {...register('useCase')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/80 min-h-[80px]" placeholder={t('landing.pilotCta.useCasePlaceholder')} aria-required="true" />
                    {errors.useCase && <p className="text-red-300 text-xs mt-1" role="alert">{errors.useCase.message}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3">
                    {isSubmitting ? t('landing.pilotCta.submitting') : t('landing.pilotCta.applyForPilot')}
                  </Button>
                </div>
              </form>
            )}
          </div>
          {/* Benefits */}
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-white mb-8">{t('landing.pilotCta.whyPilot')}</h3>
            <ul className="space-y-5">
              {BENEFIT_KEYS.map((bk) => (
                <li key={bk} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-indigo-100 text-base">{t(`landing.pilotCta.${bk}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

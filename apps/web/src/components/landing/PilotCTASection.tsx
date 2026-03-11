import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
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

const BENEFITS = [
  '90 days free — no credit card',
  'Full feature access including Air-Gapped option',
  'Dedicated onboarding specialist',
  'Data migration assistance',
  'Custom white-label domain setup',
];

export function PilotCTASection() {
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
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="mt-4 text-indigo-200 text-lg max-w-2xl mx-auto">
            Apply for your free 90-day pilot and see why institutions choose EduSphere.
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
                <h3 className="text-2xl font-bold text-white mb-2">Application received!</h3>
                <p className="text-indigo-200">We&apos;ll respond within 24 hours with your pilot details.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Pilot application form">
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="orgName" className="text-white text-sm font-medium">Organization Name *</Label>
                    <Input id="orgName" {...register('orgName')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="University of..." aria-required="true" />
                    {errors.orgName && <p className="text-red-300 text-xs mt-1" role="alert">{errors.orgName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="orgType" className="text-white text-sm font-medium">Organization Type *</Label>
                    <Select onValueChange={(v) => setValue('orgType', v as FormData['orgType'])} aria-required="true">
                      <SelectTrigger id="orgType" className="mt-1.5 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIVERSITY">University</SelectItem>
                        <SelectItem value="COLLEGE">College</SelectItem>
                        <SelectItem value="CORPORATE">Corporate</SelectItem>
                        <SelectItem value="GOVERNMENT">Government</SelectItem>
                        <SelectItem value="DEFENSE">Defense</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.orgType && <p className="text-red-300 text-xs mt-1" role="alert">{errors.orgType.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactName" className="text-white text-sm font-medium">Contact Name *</Label>
                      <Input id="contactName" {...register('contactName')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="Dr. Jane Smith" aria-required="true" />
                      {errors.contactName && <p className="text-red-300 text-xs mt-1" role="alert">{errors.contactName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-white text-sm font-medium">Email *</Label>
                      <Input id="email" type="email" {...register('email')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="jane@university.edu" aria-required="true" />
                      {errors.email && <p className="text-red-300 text-xs mt-1" role="alert">{errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-white text-sm font-medium">Phone</Label>
                      <Input id="phone" {...register('phone')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="+1 (555) 000-0000" />
                    </div>
                    <div>
                      <Label htmlFor="estimatedUsers" className="text-white text-sm font-medium">Estimated Users *</Label>
                      <Input id="estimatedUsers" type="number" {...register('estimatedUsers')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="500" aria-required="true" />
                      {errors.estimatedUsers && <p className="text-red-300 text-xs mt-1" role="alert">{errors.estimatedUsers.message}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="useCase" className="text-white text-sm font-medium">Use Case *</Label>
                    <Textarea id="useCase" {...register('useCase')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[80px]" placeholder="Describe your learning goals..." aria-required="true" />
                    {errors.useCase && <p className="text-red-300 text-xs mt-1" role="alert">{errors.useCase.message}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3">
                    {isSubmitting ? 'Submitting…' : 'Apply for Free Pilot'}
                  </Button>
                </div>
              </form>
            )}
          </div>
          {/* Benefits */}
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-bold text-white mb-8">Why pilot with EduSphere?</h3>
            <ul className="space-y-5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-indigo-100 text-base">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * PilotSignupPage — Public B2B pilot request form.
 * Route: /pilot (no auth required)
 */
import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const REQUEST_PILOT_MUTATION = `
  mutation RequestPilot($input: PilotRequestInput!) {
    requestPilot(input: $input) {
      status
      message
      requestId
    }
  }
`;

const schema = z.object({
  orgName: z.string().min(2).max(200),
  orgType: z.enum(['UNIVERSITY', 'COLLEGE', 'CORPORATE', 'GOVERNMENT', 'DEFENSE']),
  contactName: z.string().min(2).max(200),
  contactEmail: z.string().email().max(255),
  useCase: z.string().min(10).max(2000),
  estimatedUsers: z.number().int().min(1).max(1_000_000),
});

type FormData = z.infer<typeof schema>;

export function PilotSignupPage() {
  const [success, setSuccess] = useState(false);
  const [{ fetching, error }, executeMutation] = useMutation(REQUEST_PILOT_MUTATION);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const result = await executeMutation({ input: data });
    if (!result.error) setSuccess(true);
  };

  return (
    <div data-testid="pilot-signup-page" className="min-h-screen bg-gradient-to-br from-indigo-900 to-slate-900">
      <nav className="px-6 py-4 flex items-center gap-2">
        <Brain className="h-7 w-7 text-indigo-300" aria-hidden="true" />
        <Link to="/landing" className="text-xl font-bold text-white">EduSphere</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Start Your Free Pilot</h1>
          <p className="mt-3 text-indigo-200">90 days, full features, no credit card required.</p>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8">
          {success ? (
            <div data-testid="pilot-success-message" className="text-center py-8" role="status" aria-live="polite">
              <p className="text-4xl mb-4">✅</p>
              <h2 className="text-2xl font-bold text-white mb-2">Request Received</h2>
              <p className="text-indigo-200">EduSphere will review within 24 hours. Check your email.</p>
            </div>
          ) : (
            <form data-testid="pilot-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
                    <Label htmlFor="contactEmail" className="text-white text-sm font-medium">Email *</Label>
                    <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="jane@university.edu" aria-required="true" />
                    {errors.contactEmail && <p className="text-red-300 text-xs mt-1" role="alert">{errors.contactEmail.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="estimatedUsers" className="text-white text-sm font-medium">Estimated Users *</Label>
                  <Input id="estimatedUsers" type="number" min={1} max={1000000} {...register('estimatedUsers', { valueAsNumber: true })} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="500" aria-required="true" />
                  {errors.estimatedUsers && <p className="text-red-300 text-xs mt-1" role="alert">{errors.estimatedUsers.message}</p>}
                </div>

                <div>
                  <Label htmlFor="useCase" className="text-white text-sm font-medium">Use Case *</Label>
                  <Textarea id="useCase" {...register('useCase')} className="mt-1.5 bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[80px]" placeholder="Describe your learning goals..." aria-required="true" />
                  {errors.useCase && <p className="text-red-300 text-xs mt-1" role="alert">{errors.useCase.message}</p>}
                </div>

                {error && (
                  <p data-testid="pilot-error-message" className="text-red-300 text-sm text-center" role="alert">
                    {error.message ?? 'Something went wrong. Please try again.'}
                  </p>
                )}

                <Button
                  data-testid="pilot-submit-btn"
                  type="submit"
                  disabled={fetching}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3"
                >
                  {fetching ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true" />
                      Submitting…
                    </span>
                  ) : 'Submit'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * LtiPlatformForm -- Registration form for LTI 1.3 platforms.
 * Extracted from LtiSettingsPage for file-size compliance.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface RegisterFormState {
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  keySetUrl: string;
  deploymentId: string;
}

const EMPTY_FORM: RegisterFormState = {
  platformName: '',
  platformUrl: '',
  clientId: '',
  authLoginUrl: '',
  authTokenUrl: '',
  keySetUrl: '',
  deploymentId: '',
};

const FORM_FIELDS = [
  'platformName',
  'platformUrl',
  'clientId',
  'authLoginUrl',
  'authTokenUrl',
  'keySetUrl',
  'deploymentId',
] as const;

interface LtiPlatformFormProps {
  onSubmit: (form: RegisterFormState) => Promise<void> | void;
  onCancel: () => void;
}

export function LtiPlatformForm({ onSubmit, onCancel }: LtiPlatformFormProps) {
  const [form, setForm] = useState<RegisterFormState>(EMPTY_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    setForm(EMPTY_FORM);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register LTI 1.3 Platform</CardTitle>
        <CardDescription>
          Enter the platform credentials from your LMS admin panel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-3"
        >
          {FORM_FIELDS.map((field) => (
            <div key={field}>
              <label htmlFor={field} className="text-sm font-medium capitalize">
                {field.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                id={field}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                required
                value={form[field]}
                onChange={(e) =>
                  setForm((p) => ({ ...p, [field]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button type="submit" size="sm">
              Save Platform
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type { RegisterFormState };

/**
 * SecuritySettingsPage.sections — Sub-sections for the security settings form.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface SecurityFormValues {
  mfaRequired: boolean;
  mfaRequiredForAdmins: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  loginAttemptLockoutThreshold: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  passwordExpiryDays: string;
  ipAllowlist: string;
}

interface Props {
  values: SecurityFormValues;
  onChange: (v: SecurityFormValues) => void;
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'bg-primary' : 'bg-input'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

export function MfaSection({ values, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Multi-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Toggle
          id="mfa-all"
          checked={values.mfaRequired}
          onChange={(v) => onChange({ ...values, mfaRequired: v })}
          label="Require MFA for all users"
        />
        <Toggle
          id="mfa-admins"
          checked={values.mfaRequiredForAdmins}
          onChange={(v) => onChange({ ...values, mfaRequiredForAdmins: v })}
          label="Require MFA for admins"
        />
      </CardContent>
    </Card>
  );
}

const TIMEOUT_OPTIONS = [30, 60, 120, 240, 480] as const;

export function SessionSection({ values, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Session Management</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="sess-timeout">Session Timeout</Label>
          <select
            id="sess-timeout"
            value={values.sessionTimeoutMinutes}
            onChange={(e) =>
              onChange({
                ...values,
                sessionTimeoutMinutes: Number(e.target.value),
              })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {TIMEOUT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} hr`}
              </option>
            ))}
            <option value={values.sessionTimeoutMinutes}>
              {values.sessionTimeoutMinutes} min (custom)
            </option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sess-max">Max Concurrent Sessions</Label>
          <Input
            id="sess-max"
            type="number"
            min={1}
            max={20}
            value={values.maxConcurrentSessions}
            onChange={(e) =>
              onChange({
                ...values,
                maxConcurrentSessions: Number(e.target.value),
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PasswordSection({ values, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password Policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="pw-min">Minimum Length</Label>
            <Input
              id="pw-min"
              type="number"
              min={6}
              max={128}
              value={values.passwordMinLength}
              onChange={(e) =>
                onChange({
                  ...values,
                  passwordMinLength: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw-expiry">Expiry Days (0 = never)</Label>
            <Input
              id="pw-expiry"
              type="number"
              min={0}
              value={values.passwordExpiryDays}
              onChange={(e) =>
                onChange({ ...values, passwordExpiryDays: e.target.value })
              }
            />
          </div>
        </div>
        <Toggle
          id="pw-special"
          checked={values.passwordRequireSpecialChars}
          onChange={(v) =>
            onChange({ ...values, passwordRequireSpecialChars: v })
          }
          label="Require special characters"
        />
      </CardContent>
    </Card>
  );
}

export function AccessControlSection({ values, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Access Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="lockout">Login Attempt Lockout Threshold</Label>
          <Input
            id="lockout"
            type="number"
            min={1}
            max={20}
            value={values.loginAttemptLockoutThreshold}
            onChange={(e) =>
              onChange({
                ...values,
                loginAttemptLockoutThreshold: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ip-allowlist">
            IP Allowlist (one CIDR per line; leave empty to allow all)
          </Label>
          <textarea
            id="ip-allowlist"
            value={values.ipAllowlist}
            onChange={(e) =>
              onChange({ ...values, ipAllowlist: e.target.value })
            }
            rows={4}
            placeholder={'192.168.1.0/24\n10.0.0.0/8'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}

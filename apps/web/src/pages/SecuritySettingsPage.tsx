/**
 * SecuritySettingsPage — MFA, session, password policy, and IP restrictions.
 * Route: /admin/security
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  SECURITY_SETTINGS_QUERY,
  UPDATE_SECURITY_SETTINGS_MUTATION,
} from '@/lib/graphql/security.queries';
import {
  MfaSection,
  SessionSection,
  PasswordSection,
  AccessControlSection,
  type SecurityFormValues,
} from './SecuritySettingsPage.sections';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface SecurityData {
  mfaRequired: boolean;
  mfaRequiredForAdmins: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  loginAttemptLockoutThreshold: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  passwordExpiryDays: number | null;
  ipAllowlist: string[];
}

function toFormValues(data: SecurityData): SecurityFormValues {
  return {
    mfaRequired: data.mfaRequired,
    mfaRequiredForAdmins: data.mfaRequiredForAdmins,
    sessionTimeoutMinutes: data.sessionTimeoutMinutes,
    maxConcurrentSessions: data.maxConcurrentSessions,
    loginAttemptLockoutThreshold: data.loginAttemptLockoutThreshold,
    passwordMinLength: data.passwordMinLength,
    passwordRequireSpecialChars: data.passwordRequireSpecialChars,
    passwordExpiryDays: String(data.passwordExpiryDays ?? 0),
    ipAllowlist: (data.ipAllowlist ?? []).join('\n'),
  };
}

const DEFAULTS: SecurityFormValues = {
  mfaRequired: false,
  mfaRequiredForAdmins: true,
  sessionTimeoutMinutes: 480,
  maxConcurrentSessions: 5,
  loginAttemptLockoutThreshold: 5,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  passwordExpiryDays: '0',
  ipAllowlist: '',
};

export function SecuritySettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [form, setForm] = useState<SecurityFormValues>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  const [{ data, fetching }] = useQuery({ query: SECURITY_SETTINGS_QUERY });
  const [{ fetching: saving }, execUpdate] = useMutation(
    UPDATE_SECURITY_SETTINGS_MUTATION
  );

  useEffect(() => {
    if (data?.mySecuritySettings) {
      setForm(toFormValues(data.mySecuritySettings as SecurityData));
    }
  }, [data]);

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const handleSave = async () => {
    const expiryRaw = Number(form.passwordExpiryDays);
    const ipList = form.ipAllowlist
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    await execUpdate({
      input: {
        mfaRequired: form.mfaRequired,
        mfaRequiredForAdmins: form.mfaRequiredForAdmins,
        sessionTimeoutMinutes: form.sessionTimeoutMinutes,
        maxConcurrentSessions: form.maxConcurrentSessions,
        loginAttemptLockoutThreshold: form.loginAttemptLockoutThreshold,
        passwordMinLength: form.passwordMinLength,
        passwordRequireSpecialChars: form.passwordRequireSpecialChars,
        passwordExpiryDays: expiryRaw > 0 ? expiryRaw : null,
        ipAllowlist: ipList,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const props = { values: form, onChange: setForm };

  return (
    <AdminLayout
      title="Security Settings"
      description="Configure authentication and access policies"
    >
      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <MfaSection {...props} />
          <SessionSection {...props} />
          <PasswordSection {...props} />
          <AccessControlSection {...props} />

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Settings saved.</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Settings will take effect for new sessions.
          </p>
        </div>
      )}
    </AdminLayout>
  );
}

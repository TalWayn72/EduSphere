/**
 * LtiSettingsPage -- LTI 1.3 Platform Management (F-018)
 * Route: /admin/lti
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { TOAST_AUTO_DISMISS_MS } from '@/lib/constants';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  Plus,
  AlertCircle,
  Loader2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import { LtiPlatformForm } from './LtiPlatformForm';
import { LtiPlatformCard } from './LtiPlatformCard';
import type { LtiPlatform } from './LtiPlatformCard';

const LTI_PLATFORMS_QUERY = `
  query LtiPlatforms {
    ltiPlatforms {
      id platformName platformUrl clientId authLoginUrl keySetUrl deploymentId isActive
    }
  }
` as const;

const REGISTER_PLATFORM_MUTATION = `
  mutation RegisterLtiPlatform($input: RegisterLtiPlatformInput!) {
    registerLtiPlatform(input: $input) { id platformName isActive }
  }
` as const;

const TOGGLE_PLATFORM_MUTATION = `
  mutation ToggleLtiPlatform($id: ID!, $isActive: Boolean!) {
    toggleLtiPlatform(id: $id, isActive: $isActive) { id isActive }
  }
` as const;

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export function LtiSettingsPage() {
  const role = useAuthRole();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [{ data, fetching, error }, refetch] = useQuery<{
    ltiPlatforms: LtiPlatform[];
  }>({
    query: LTI_PLATFORMS_QUERY,
    pause: !mounted,
  });

  const [, registerPlatform] = useMutation(REGISTER_PLATFORM_MUTATION);
  const [, togglePlatform] = useMutation(TOGGLE_PLATFORM_MUTATION);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const callbackUrl =
    window.location.origin.replace(':5173', ':4000') + '/lti/callback';

  const handleCopyUrl = () => {
    void navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), TOAST_AUTO_DISMISS_MS);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await togglePlatform({ id, isActive: !current });
    refetch({ requestPolicy: 'network-only' });
  };

  const handleSubmit = async () => {
    setShowForm(false);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleTestConnection = async (keySetUrl: string) => {
    setTestResult(null);
    try {
      const res = await fetch(keySetUrl);
      setTestResult({
        ok: res.ok,
        message: res.ok
          ? 'JWKS reachable (HTTP ' + res.status + ')'
          : 'JWKS unreachable: HTTP ' + res.status,
      });
    } catch {
      setTestResult({
        ok: false,
        message: 'Connection failed. Please check the URL and try again.',
      });
    }
  };

  return (
    <Layout>
      <PageShell size="md">
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'LTI' },
          ]}
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LTI 1.3 Platforms</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect external LMS platforms (Canvas, Moodle, Blackboard)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy Launch URL'}
            </Button>
            <Button size="sm" onClick={() => setShowForm((p) => !p)}>
              <Plus className="h-4 w-4 mr-1" /> Register Platform
            </Button>
          </div>
        </div>

        {showForm && (
          <LtiPlatformForm
            onSubmit={async (form) => {
              await registerPlatform({ input: form });
              await handleSubmit();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {fetching && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load LTI settings. Please try again.</span>
          </div>
        )}

        {testResult !== null && (
          <div
            role="status"
            aria-live="polite"
            className={
              testResult.ok
                ? 'flex items-center gap-2 text-green-600 text-sm'
                : 'flex items-center gap-2 text-destructive text-sm'
            }
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {testResult.message}
          </div>
        )}

        {data?.ltiPlatforms.map((platform) => (
          <LtiPlatformCard
            key={platform.id}
            platform={platform}
            onToggle={(id, current) => { void handleToggle(id, current); }}
            onTestConnection={(url) => { void handleTestConnection(url); }}
          />
        ))}

        {!fetching && !error && data?.ltiPlatforms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No LTI platforms registered yet. Click "Register Platform" to
            connect your LMS.
          </div>
        )}
      </PageShell>
    </Layout>
  );
}

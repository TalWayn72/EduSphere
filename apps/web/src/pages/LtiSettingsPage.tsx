/**
 * LtiSettingsPage -- LTI 1.3 Platform Management (F-018)
 * Route: /admin/lti
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  Link2,
  Plus,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  Copy,
  CheckCircle2,
} from 'lucide-react';

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

interface LtiPlatform {
  id: string;
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  keySetUrl: string;
  deploymentId: string;
  isActive: boolean;
}

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

export function LtiSettingsPage() {
  const role = useAuthRole();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RegisterFormState>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);

  const [{ data, fetching, error }, refetch] = useQuery<{
    ltiPlatforms: LtiPlatform[];
  }>({
    query: LTI_PLATFORMS_QUERY,
  });

  const [, registerPlatform] = useMutation(REGISTER_PLATFORM_MUTATION);
  const [, togglePlatform] = useMutation(TOGGLE_PLATFORM_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  const callbackUrl =
    window.location.origin.replace(':5173', ':4000') + '/lti/callback';

  const handleCopyUrl = () => {
    void navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await togglePlatform({ id, isActive: !current });
    refetch({ requestPolicy: 'network-only' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registerPlatform({ input: form });
    setForm(EMPTY_FORM);
    setShowForm(false);
    refetch({ requestPolicy: 'network-only' });
  };

  const handleTestConnection = async (keySetUrl: string) => {
    try {
      const res = await fetch(keySetUrl);
      alert(
        res.ok
          ? 'JWKS reachable (HTTP ' + res.status + ')'
          : 'JWKS unreachable: HTTP ' + res.status
      );
    } catch (err) {
      alert('Connection failed: ' + String(err));
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LTI 1.3 Platforms</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect external LMS platforms (Canvas, Moodle, Blackboard)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              {copied ? (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy Launch URL'}
            </Button>
            <Button size="sm" onClick={() => setShowForm((p) => !p)}>
              <Plus className="h-4 w-4 mr-1" /> Register Platform
            </Button>
          </div>
        </div>

        {showForm && (
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
                {(
                  [
                    'platformName',
                    'platformUrl',
                    'clientId',
                    'authLoginUrl',
                    'authTokenUrl',
                    'keySetUrl',
                    'deploymentId',
                  ] as const
                ).map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium capitalize">
                      {field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
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
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {fetching && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        )}

        {data?.ltiPlatforms.map((platform) => (
          <Card key={platform.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {platform.platformName}
                    </span>
                    <span
                      className={
                        platform.isActive
                          ? 'text-xs text-green-600'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {platform.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {platform.platformUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Client ID: {platform.clientId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleTestConnection(platform.keySetUrl);
                    }}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void handleToggle(platform.id, platform.isActive);
                    }}
                  >
                    {platform.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!fetching && !error && data?.ltiPlatforms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No LTI platforms registered yet. Click "Register Platform" to
            connect your LMS.
          </div>
        )}
      </div>
    </Layout>
  );
}

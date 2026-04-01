/**
 * ScimSettingsPage - HRIS SCIM 2.0 integration settings.
 * Route: /admin/scim
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-019)
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { TOAST_AUTO_DISMISS_MS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  SCIM_TOKENS_QUERY,
  SCIM_SYNC_LOG_QUERY,
  GENERATE_SCIM_TOKEN_MUTATION,
  REVOKE_SCIM_TOKEN_MUTATION,
} from '@/lib/graphql/scim.queries';
import { Shield, Copy } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import {
  ADMIN_ROLES,
  type ScimToken,
  type ScimSyncEntry,
} from './scim-settings.types';
import { ScimTokenList } from './ScimTokenList';
import { ScimSyncLog } from './ScimSyncLog';
import { GenerateTokenDialog } from './GenerateTokenDialog';

export function ScimSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [tokensResult, refetchTokens] = useQuery<{ scimTokens: ScimToken[] }>({
    query: SCIM_TOKENS_QUERY,
    pause: !mounted,
  });
  const [logResult] = useQuery<{ scimSyncLog: ScimSyncEntry[] }>({
    query: SCIM_SYNC_LOG_QUERY,
    variables: { limit: 50 },
    pause: !mounted,
  });
  const [, generateToken] = useMutation(GENERATE_SCIM_TOKEN_MUTATION);
  const [, revokeToken] = useMutation(REVOKE_SCIM_TOKEN_MUTATION);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const scimBaseUrl = window.location.origin + '/scim/v2';

  const handleCopyEndpoint = async () => {
    await navigator.clipboard.writeText(scimBaseUrl);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopied(false),
      TOAST_AUTO_DISMISS_MS
    );
  };

  const handleGenerateToken = async () => {
    if (!description.trim()) return;
    const days = expiresInDays ? parseInt(expiresInDays, 10) : undefined;
    const result = await generateToken({
      input: { description: description.trim(), expiresInDays: days },
    });
    if (result.data?.generateScimToken?.rawToken) {
      setGeneratedToken(result.data.generateScimToken.rawToken);
      void refetchTokens({ requestPolicy: 'network-only' });
    }
  };

  const handleRevoke = async (id: string) => {
    await revokeToken({ id });
    void refetchTokens({ requestPolicy: 'network-only' });
  };

  const tokens = tokensResult.data?.scimTokens ?? [];
  const logEntries = logResult.data?.scimSyncLog ?? [];

  return (
    <Layout>
      <PageShell size="md">
        <Breadcrumbs
          items={[{ label: 'Admin', href: '/admin' }, { label: 'SCIM' }]}
        />
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">SCIM / HRIS Integration</h1>
            <p className="text-muted-foreground text-sm">
              Manage SCIM 2.0 provisioning for Workday, BambooHR, ADP
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>SCIM Endpoint</CardTitle>
            <CardDescription>
              Use this URL in your HRIS system to provision users automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
              <span className="flex-1 truncate">{scimBaseUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCopyEndpoint()}
              >
                <Copy className="h-4 w-4" />
                <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        <ScimTokenList
          tokens={tokens}
          fetching={tokensResult.fetching}
          onGenerateClick={() => {
            setShowModal(true);
            setGeneratedToken(null);
          }}
          onRevoke={(id) => void handleRevoke(id)}
        />
        <ScimSyncLog entries={logEntries} />
      </PageShell>
      <GenerateTokenDialog
        open={showModal}
        onOpenChange={setShowModal}
        description={description}
        onDescriptionChange={setDescription}
        expiresInDays={expiresInDays}
        onExpiresInDaysChange={setExpiresInDays}
        generatedToken={generatedToken}
        onGenerate={handleGenerateToken}
        onDone={() => {
          setShowModal(false);
          setDescription('');
          setExpiresInDays('');
          setGeneratedToken(null);
        }}
      />
    </Layout>
  );
}

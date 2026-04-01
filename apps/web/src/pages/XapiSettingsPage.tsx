/**
 * XapiSettingsPage - xAPI 1.0.3 / LRS integration settings.
 * Route: /admin/xapi
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-028)
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
  XAPI_TOKENS_QUERY,
  XAPI_STATEMENTS_QUERY,
  GENERATE_XAPI_TOKEN_MUTATION,
  REVOKE_XAPI_TOKEN_MUTATION,
} from '@/lib/graphql/xapi.queries';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import { Database, Copy } from 'lucide-react';
import { XapiTokenSection } from './XapiTokenSection';
import { XapiStatementViewer } from './XapiStatementViewer';
import type { XapiToken } from './XapiTokenSection';
import type { XapiStatement } from './XapiStatementViewer';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export function XapiSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);

        if (import.meta.env.DEV)
          console.warn(
            '[XapiSettingsPage] cleanup: copy timer cleared on unmount'
          );
      }
    };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [tokensResult, refetchTokens] = useQuery<{ xapiTokens: XapiToken[] }>({
    query: XAPI_TOKENS_QUERY,
    pause: !mounted,
  });
  const [statementsResult] = useQuery<{ xapiStatements: XapiStatement[] }>({
    query: XAPI_STATEMENTS_QUERY,
    variables: { limit: 20 },
    pause: !mounted,
  });
  const [, generateToken] = useMutation(GENERATE_XAPI_TOKEN_MUTATION);
  const [, revokeToken] = useMutation(REVOKE_XAPI_TOKEN_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }
  const lrsBaseUrl = window.location.origin + '/xapi';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lrsBaseUrl);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopied(false),
      TOAST_AUTO_DISMISS_MS
    );
  };

  const handleGenerate = async (
    description: string,
    lrsEndpoint: string
  ): Promise<string | null> => {
    const result = await generateToken({
      description,
      lrsEndpoint: lrsEndpoint || undefined,
    });
    if (result.data?.generateXapiToken) {
      void refetchTokens({ requestPolicy: 'network-only' });
      return result.data.generateXapiToken as string;
    }
    return null;
  };

  const handleRevoke = async (id: string) => {
    await revokeToken({ tokenId: id });
    void refetchTokens({ requestPolicy: 'network-only' });
  };

  return (
    <Layout>
      <PageShell size="md">
        <Breadcrumbs
          items={[{ label: 'Admin', href: '/admin' }, { label: 'xAPI' }]}
        />
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">xAPI / LRS Integration</h1>
            <p className="text-muted-foreground text-sm">
              Self-hosted LRS &nbsp;
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                xAPI 1.0.3
              </span>
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>LRS Endpoint</CardTitle>
            <CardDescription>
              Submit xAPI statements to this URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
              <span className="flex-1 truncate">{lrsBaseUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCopy()}
              >
                <Copy className="h-4 w-4" />
                <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              POST /xapi/statements &nbsp;|&nbsp; GET /xapi/statements
              &nbsp;|&nbsp; GET /xapi/about
            </p>
          </CardContent>
        </Card>
        <XapiTokenSection
          tokens={tokensResult.data?.xapiTokens ?? []}
          fetching={tokensResult.fetching}
          onGenerate={handleGenerate}
          onRevoke={(id) => {
            void handleRevoke(id);
          }}
        />
        <XapiStatementViewer
          statements={statementsResult.data?.xapiStatements ?? []}
        />
      </PageShell>
    </Layout>
  );
}

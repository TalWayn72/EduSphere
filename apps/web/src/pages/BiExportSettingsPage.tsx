/**
 * BiExportSettingsPage - BI Tool OData v4 export settings.
 * Route: /admin/bi-export
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-029)
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
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
  BI_API_TOKENS_QUERY,
  GENERATE_BI_API_KEY_MUTATION,
  REVOKE_BI_API_KEY_MUTATION,
} from '@/lib/graphql/bi-export.queries';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  BarChart2,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
const ODATA_BASE = `${window.location.protocol}//${window.location.hostname}:4002/odata/v1`;

const ODATA_ENDPOINTS = [
  { label: 'Enrollments', url: `${ODATA_BASE}/Enrollments` },
  { label: 'Completions', url: `${ODATA_BASE}/Completions` },
  { label: 'Quiz Results', url: `${ODATA_BASE}/QuizResults` },
  { label: 'Activity Log', url: `${ODATA_BASE}/ActivityLog` },
];

interface BiApiToken {
  id: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function BiExportSettingsPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [tokensResult, refetchTokens] = useQuery<{ biApiTokens: BiApiToken[] }>(
    { query: BI_API_TOKENS_QUERY, pause: !mounted }
  );
  const [, generateKey] = useMutation<{ generateBIApiKey: string }>(
    GENERATE_BI_API_KEY_MUTATION
  );
  const [, revokeKey] = useMutation(REVOKE_BI_API_KEY_MUTATION);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        if (import.meta.env.DEV) console.debug('[BiExportSettingsPage] cleanup: copy timer cleared on unmount');
      }
    };
  }, []);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedUrl(null), TOAST_AUTO_DISMISS_MS);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    const result = await generateKey({ description: description.trim() });
    if (result.data?.generateBIApiKey) {
      setGeneratedToken(result.data.generateBIApiKey);
      void refetchTokens({ requestPolicy: 'network-only' });
    }
  };

  const handleRevoke = async (tokenId: string) => {
    await revokeKey({ tokenId });
    void refetchTokens({ requestPolicy: 'network-only' });
  };

  const tokens = tokensResult.data?.biApiTokens ?? [];

  return (
    <Layout>
      <PageShell size="md">
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'BI Export' },
          ]}
        />
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">BI Tool Export</h1>
            <p className="text-muted-foreground text-sm">
              OData v4 endpoints for Power BI, Tableau, and other BI tools
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>OData Endpoints</CardTitle>
            <CardDescription>
              Connect your BI tool to these OData v4 URLs using Bearer token
              authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ODATA_ENDPOINTS.map((ep) => (
              <div
                key={ep.label}
                className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm"
              >
                <span className="text-muted-foreground w-28 shrink-0 font-sans text-xs font-medium">
                  {ep.label}
                </span>
                <span className="flex-1 truncate text-xs">{ep.url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopy(ep.url)}
                >
                  <Copy className="h-4 w-4" />
                  <span className="ml-1">
                    {copiedUrl === ep.url ? 'Copied!' : 'Copy'}
                  </span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>
                Bearer tokens for BI tool OData authentication
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowModal(true);
                setGeneratedToken(null);
                setDescription('');
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Generate Token
            </Button>
          </CardHeader>
          <CardContent>
            {tokensResult.fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No tokens yet. Generate one to connect your BI tool.
              </p>
            ) : (
              <div className="divide-y">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{token.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(token.createdAt).toLocaleDateString()}
                        {token.lastUsedAt !== null && (
                          <span>
                            {' '}
                            &middot; Last used{' '}
                            {new Date(token.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={
                        token.isActive
                          ? 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700'
                          : 'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700'
                      }
                    >
                      {token.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {token.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void handleRevoke(token.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            if (!generatedToken) setShowModal(false);
          }}
        >
          <div
            className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{t('biExport.generateModalTitle')}</h2>
            {generatedToken ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm dark:bg-amber-950 dark:border-amber-700">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                  <span className="text-amber-800 dark:text-amber-200">
                    {t('biExport.tokenWarning')}
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
                  {generatedToken}
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowModal(false);
                    setGeneratedToken(null);
                  }}
                >
                  {t('biExport.done')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    {t('biExport.description')}
                  </label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder={t('biExport.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    {t('biExport.cancel')}
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!description.trim()}
                    onClick={() => void handleGenerate()}
                  >
                    {t('biExport.generate')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

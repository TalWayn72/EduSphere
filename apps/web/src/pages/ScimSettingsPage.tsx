/**
 * ScimSettingsPage - HRIS SCIM 2.0 integration settings.
 * Route: /admin/scim
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-019)
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
  SCIM_TOKENS_QUERY,
  SCIM_SYNC_LOG_QUERY,
  GENERATE_SCIM_TOKEN_MUTATION,
  REVOKE_SCIM_TOKEN_MUTATION,
} from '@/lib/graphql/scim.queries';
import { Shield, Copy, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface ScimToken {
  id: string;
  description: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}
interface ScimSyncEntry {
  id: string;
  operation: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export function ScimSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tokensResult, refetchTokens] = useQuery<{ scimTokens: ScimToken[] }>({
    query: SCIM_TOKENS_QUERY,
    pause: true,
  });
  const [logResult] = useQuery<{ scimSyncLog: ScimSyncEntry[] }>({
    query: SCIM_SYNC_LOG_QUERY,
    variables: { limit: 50 },
    pause: true,
  });
  const [, generateToken] = useMutation(GENERATE_SCIM_TOKEN_MUTATION);
  const [, revokeToken] = useMutation(REVOKE_SCIM_TOKEN_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const scimBaseUrl = window.location.origin + '/scim/v2';

  const handleCopyEndpoint = async () => {
    await navigator.clipboard.writeText(scimBaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <div className="max-w-4xl mx-auto space-y-6">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>
                Bearer tokens for HRIS SCIM authentication
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowModal(true);
                setGeneratedToken(null);
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
                No tokens yet. Generate one to get started.
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
                        {token.expiresAt !== null && (
                          <span>
                            {' '}
                            &middot; Expires{' '}
                            {new Date(token.expiresAt).toLocaleDateString()}
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
                        aria-label={`Revoke token: ${token.description}`}
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
        <Card>
          <CardHeader>
            <CardTitle>Sync Log</CardTitle>
            <CardDescription>
              Recent SCIM provisioning operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No sync operations yet.
              </p>
            ) : (
              <div className="divide-y text-sm">
                {logEntries.map((entry) => (
                  <div key={entry.id} className="py-2 flex items-center gap-3">
                    <span
                      className={
                        entry.status === 'SUCCESS'
                          ? 'font-mono text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700'
                          : 'font-mono text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700'
                      }
                    >
                      {entry.status}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {entry.operation}
                    </span>
                    {entry.externalId !== null && (
                      <span className="text-muted-foreground">
                        {entry.externalId}
                      </span>
                    )}
                    {entry.errorMessage !== null && (
                      <span className="flex items-center gap-1 text-destructive text-xs">
                        <AlertCircle className="h-3 w-3" />
                        {entry.errorMessage}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !generatedToken)
              setShowModal(false);
          }}
        >
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-lg font-semibold">Generate SCIM Token</h2>
            {generatedToken ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-amber-800">
                    Save this token - it will not be shown again.
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
                  {generatedToken}
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowModal(false);
                    setDescription('');
                    setExpiresInDays('');
                    setGeneratedToken(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="scim-token-description"
                    className="text-sm font-medium block mb-1"
                  >
                    Description
                  </label>
                  <input
                    id="scim-token-description"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="e.g. Workday Production"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="scim-token-expires"
                    className="text-sm font-medium block mb-1"
                  >
                    Expires in days (optional)
                  </label>
                  <input
                    id="scim-token-expires"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    type="number"
                    min="1"
                    placeholder="e.g. 365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!description.trim()}
                    onClick={() => void handleGenerateToken()}
                  >
                    Generate
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

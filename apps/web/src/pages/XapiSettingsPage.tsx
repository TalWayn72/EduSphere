/**
 * XapiSettingsPage - xAPI 1.0.3 / LRS integration settings.
 * Route: /admin/xapi
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-028)
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
  XAPI_TOKENS_QUERY,
  XAPI_STATEMENTS_QUERY,
  GENERATE_XAPI_TOKEN_MUTATION,
  REVOKE_XAPI_TOKEN_MUTATION,
} from '@/lib/graphql/xapi.queries';
import {
  Database,
  Copy,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
interface XapiToken {
  id: string;
  description: string;
  lrsEndpoint: string | null;
  isActive: boolean;
  createdAt: string;
}
interface XapiStatement {
  id: string;
  verb: string;
  objectId: string;
  storedAt: string;
}

export function XapiSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [lrsEndpoint, setLrsEndpoint] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [tokensResult, refetchTokens] = useQuery<{ xapiTokens: XapiToken[] }>({
    query: XAPI_TOKENS_QUERY,
    pause: true,
  });
  const [statementsResult] = useQuery<{ xapiStatements: XapiStatement[] }>({
    query: XAPI_STATEMENTS_QUERY,
    variables: { limit: 20 },
    pause: true,
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
    setTimeout(() => setCopied(false), 2000);
  };
  const handleGenerateToken = async () => {
    if (!description.trim()) return;
    const result = await generateToken({
      description: description.trim(),
      lrsEndpoint: lrsEndpoint.trim() || undefined,
    });
    if (result.data?.generateXapiToken) {
      setGeneratedToken(result.data.generateXapiToken as string);
      void refetchTokens({ requestPolicy: 'network-only' });
    }
  };
  const handleRevoke = async (id: string) => {
    await revokeToken({ tokenId: id });
    void refetchTokens({ requestPolicy: 'network-only' });
  };

  const tokens = tokensResult.data?.xapiTokens ?? [];
  const statements = statementsResult.data?.xapiStatements ?? [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>
                Bearer tokens for LRS authentication
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowModal(true);
                setGeneratedToken(null);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Generate
            </Button>
          </CardHeader>
          <CardContent>
            {tokensResult.fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : tokens.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tokens yet.</p>
            ) : (
              <div className="divide-y">
                {tokens.map((t) => (
                  <div
                    key={t.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(t.createdAt).toLocaleDateString()}
                        {t.lrsEndpoint !== null && (
                          <span> &middot; Fwd {t.lrsEndpoint}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={
                        t.isActive
                          ? 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700'
                          : 'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700'
                      }
                    >
                      {t.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {t.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void handleRevoke(t.id)}
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
            <CardTitle>Recent Statements</CardTitle>
            <CardDescription>
              Last 20 xAPI statements stored in this LRS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statements.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No statements yet.
              </p>
            ) : (
              <div className="divide-y text-sm">
                {statements.map((s) => (
                  <div key={s.id} className="py-2 flex items-center gap-3">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      {s.verb.split('/').pop()}
                    </span>
                    <span className="text-muted-foreground truncate flex-1 text-xs">
                      {s.objectId}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {new Date(s.storedAt).toLocaleString()}
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
          onClick={() => {
            if (!generatedToken) setShowModal(false);
          }}
        >
          <div
            className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Generate xAPI Token</h2>
            {generatedToken ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-amber-800">
                    Save this token — it will not be shown again.
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
                    setLrsEndpoint('');
                    setGeneratedToken(null);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Description
                  </label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="e.g. Rustici SCORM Cloud"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    External LRS URL (optional)
                  </label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="https://lrs.example.com"
                    value={lrsEndpoint}
                    onChange={(e) => setLrsEndpoint(e.target.value)}
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

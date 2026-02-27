/**
 * CrmSettingsPage — Salesforce CRM integration settings.
 * Route: /admin/crm
 * Access: ORG_ADMIN, SUPER_ADMIN only (F-033)
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
  CRM_CONNECTION_QUERY,
  CRM_SYNC_LOG_QUERY,
  DISCONNECT_CRM_MUTATION,
} from '@/lib/graphql/crm.queries';
import {
  Link,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Unplug,
} from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface CrmConnectionData {
  id: string;
  provider: string;
  instanceUrl: string;
  isActive: boolean;
  createdAt: string;
}
interface CrmSyncEntry {
  id: string;
  operation: string;
  externalId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export function CrmSettingsPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [copied, setCopied] = useState(false);

  const [connResult, refetchConn] = useQuery<{
    crmConnection: CrmConnectionData | null;
  }>({
    query: CRM_CONNECTION_QUERY,
    pause: true,
  });
  const [logResult] = useQuery<{ crmSyncLog: CrmSyncEntry[] }>({
    query: CRM_SYNC_LOG_QUERY,
    variables: { limit: 20 },
    pause: true,
  });
  const [, disconnectCrm] = useMutation(DISCONNECT_CRM_MUTATION);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const conn = connResult.data?.crmConnection ?? null;
  const logEntries = logResult.data?.crmSyncLog ?? [];
  const webhookUrl = `${window.location.origin}/crm/salesforce/webhook`;

  const handleConnect = () => {
    window.location.href = '/crm/salesforce/connect';
  };

  const handleDisconnect = async () => {
    await disconnectCrm({});
    void refetchConn({ requestPolicy: 'network-only' });
  };

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Salesforce CRM Integration</h1>
            <p className="text-muted-foreground text-sm">
              Sync course completions to Salesforce and accept enrollment
              webhooks
            </p>
          </div>
        </div>

        {/* Connection status card */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              OAuth 2.0 connection to your Salesforce org
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connResult.fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking
                connection...
              </div>
            ) : conn?.isActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Connected to Salesforce</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Instance:{' '}
                  <span className="font-mono">{conn.instanceUrl}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected since{' '}
                  {new Date(conn.createdAt).toLocaleDateString()}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleDisconnect()}
                >
                  <Unplug className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-5 w-5" />
                  <span>Not connected</span>
                </div>
                <Button onClick={handleConnect}>
                  <Link className="h-4 w-4 mr-1" /> Connect Salesforce
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook URL card */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>
              Configure this URL in Salesforce to push enrollment events to
              EduSphere
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm">
              <span className="flex-1 truncate">{webhookUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCopyWebhook()}
              >
                <Copy className="h-4 w-4" />
                <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Set <span className="font-mono">X-Salesforce-HMAC-SHA256</span>{' '}
              header using your
              <span className="font-mono"> SALESFORCE_WEBHOOK_SECRET</span> env
              var.
            </p>
          </CardContent>
        </Card>

        {/* Sync log card */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Log</CardTitle>
            <CardDescription>
              Last 20 CRM synchronization operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logResult.fetching ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : logEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No sync operations yet.
              </p>
            ) : (
              <div className="divide-y text-sm">
                {logEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-2 flex items-center gap-3 flex-wrap"
                  >
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
                      <span className="text-xs text-muted-foreground">
                        {entry.externalId}
                      </span>
                    )}
                    {entry.errorMessage !== null && (
                      <span className="text-xs text-destructive truncate max-w-xs">
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
    </Layout>
  );
}

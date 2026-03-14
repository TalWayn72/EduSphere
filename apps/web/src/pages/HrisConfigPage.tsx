/**
 * HrisConfigPage — Phase 52 HRIS & Enterprise Integrations
 * Route: /admin/hris-config
 * Access: SUPER_ADMIN or ORG_ADMIN only
 * Allows configuring HRIS system connections (SCIM, Workday, SAP, Banner).
 */
import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthRole } from '@/hooks/useAuthRole';
import { Building2, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

type HrisType = 'SCIM' | 'WORKDAY' | 'SAP' | 'BANNER';

type SystemStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';

interface SystemCard {
  type: HrisType;
  label: string;
  status: SystemStatus;
  lastSync?: string;
}

const SYSTEM_CARDS: SystemCard[] = [
  { type: 'SCIM', label: 'SCIM 2.0 (Generic)', status: 'NOT_CONFIGURED' },
  { type: 'WORKDAY', label: 'Workday', status: 'NOT_CONFIGURED' },
  { type: 'SAP', label: 'SAP SuccessFactors', status: 'NOT_CONFIGURED' },
  { type: 'BANNER', label: 'Banner (Ellucian)', status: 'NOT_CONFIGURED' },
];

const STATUS_STYLES: Record<SystemStatus, string> = {
  CONNECTED: 'text-green-700 bg-green-50 border-green-200',
  NOT_CONFIGURED: 'text-gray-500 bg-gray-50 border-gray-200',
  ERROR: 'text-red-700 bg-red-50 border-red-200',
};

const STATUS_ICONS: Record<SystemStatus, React.ReactNode> = {
  CONNECTED: <CheckCircle className="h-4 w-4 text-green-600" />,
  NOT_CONFIGURED: <XCircle className="h-4 w-4 text-gray-400" />,
  ERROR: <XCircle className="h-4 w-4 text-red-600" />,
};

interface SyncEntry {
  id: string;
  type: string;
  timestamp: string;
  usersUpserted: number;
  errors: number;
  status: 'SUCCESS' | 'ERROR';
}

const MOCK_SYNC_HISTORY: SyncEntry[] = [];
const [fetching] = [false];

export function HrisConfigPage() {
  const role = useAuthRole();
  const [systemType, setSystemType] = useState<HrisType>('SCIM');
  const [baseUrl, setBaseUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [baseUrlError, setBaseUrlError] = useState('');
  const [baseUrlTouched, setBaseUrlTouched] = useState(false);

  if (!ADMIN_ROLES.has(role ?? '')) {
    return (
      <Layout>
        <div className="p-8">
          <p
            className="text-destructive font-semibold"
            data-testid="access-denied"
          >
            Access Denied — Admin only
          </p>
        </div>
      </Layout>
    );
  }

  function handleTestConnection() {
    setTesting(true);
    setTimeout(() => setTesting(false), 1500);
  }

  function handleSave() {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  }

  function handleSyncNow() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  return (
    <Layout>
      <div className="p-6 space-y-6" data-testid="hris-config-page">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">HRIS &amp; Enterprise Integrations</h1>
            <p className="text-muted-foreground text-sm">
              Connect your HR system to auto-provision and sync users.
            </p>
          </div>
        </div>

        {/* System status cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SYSTEM_CARDS.map((sys) => (
            <Card key={sys.type} className={`border ${STATUS_STYLES[sys.status]}`}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{sys.label}</CardTitle>
                  {STATUS_ICONS[sys.status]}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xs">{sys.status.replace('_', ' ')}</p>
                {sys.lastSync && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {sys.lastSync}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Configuration form */}
        <Card>
          <CardHeader>
            <CardTitle>Configure HRIS Connection</CardTitle>
            <CardDescription>
              Enter credentials for the HRIS system you want to connect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-type">System Type</Label>
              <Select
                value={systemType}
                onValueChange={(v) => setSystemType(v as HrisType)}
              >
                <SelectTrigger id="system-type" data-testid="system-type-select">
                  <SelectValue placeholder="Select HRIS system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCIM">SCIM 2.0 (Generic)</SelectItem>
                  <SelectItem value="WORKDAY">Workday</SelectItem>
                  <SelectItem value="SAP">SAP SuccessFactors</SelectItem>
                  <SelectItem value="BANNER">Banner (Ellucian)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-url">
                Base URL <span aria-hidden="true" className="text-destructive">*</span>
                <span className="sr-only">(required)</span>
              </Label>
              <Input
                id="base-url"
                placeholder="https://your-hris-instance.example.com"
                value={baseUrl}
                required
                aria-required="true"
                aria-invalid={baseUrlTouched && baseUrlError ? 'true' : undefined}
                aria-describedby={baseUrlError ? 'base-url-error' : undefined}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  const val = e.target.value.trim();
                  if (val && !/^https?:\/\/.+/i.test(val)) {
                    setBaseUrlError('Please enter a valid URL starting with http:// or https://');
                  } else {
                    setBaseUrlError('');
                  }
                }}
                onBlur={() => setBaseUrlTouched(true)}
              />
              {baseUrlTouched && baseUrlError && (
                <p id="base-url-error" className="text-sm text-destructive" role="alert">
                  {baseUrlError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID (optional)</Label>
                <Input
                  id="client-id"
                  placeholder="client-id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">
                  Client Secret / API Token <span aria-hidden="true" className="text-destructive">*</span>
                  <span className="sr-only">(required)</span>
                </Label>
                <Input
                  id="client-secret"
                  type="password"
                  placeholder="••••••••"
                  value={clientSecret}
                  required
                  aria-required="true"
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !baseUrl}
                data-testid="test-connection-btn"
              >
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !baseUrl}
                data-testid="save-hris-config-btn"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
              <Button
                variant="secondary"
                onClick={handleSyncNow}
                disabled={syncing}
                data-testid="sync-now-btn"
              >
                {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sync history */}
        <Card>
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              Recent synchronization operations from your HRIS system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <table
                className="w-full text-sm"
                data-testid="sync-history-table"
                aria-label="HRIS synchronization history"
              >
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="pb-2 font-medium">Type</th>
                    <th scope="col" className="pb-2 font-medium">Timestamp</th>
                    <th scope="col" className="pb-2 font-medium">Users Synced</th>
                    <th scope="col" className="pb-2 font-medium">Errors</th>
                    <th scope="col" className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SYNC_HISTORY.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No sync history yet. Configure an HRIS connection and run a sync.
                      </td>
                    </tr>
                  ) : (
                    MOCK_SYNC_HISTORY.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-2">{entry.type}</td>
                        <td className="py-2">{entry.timestamp}</td>
                        <td className="py-2">{entry.usersUpserted}</td>
                        <td className="py-2">{entry.errors}</td>
                        <td className="py-2">{entry.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

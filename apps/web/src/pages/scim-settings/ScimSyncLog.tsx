/* eslint-disable edusphere-design-system/require-page-header -- sub-component embedded in ScimSettingsPage, not a standalone page */
/**
 * ScimSyncLog — displays recent SCIM provisioning operations.
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import type { ScimSyncEntry } from './scim-settings.types';

interface ScimSyncLogProps {
  entries: ScimSyncEntry[];
}

export function ScimSyncLog({ entries }: ScimSyncLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync Log</CardTitle>
        <CardDescription>
          Recent SCIM provisioning operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sync operations yet.
          </p>
        ) : (
          <div className="divide-y text-sm">
            {entries.map((entry) => (
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
  );
}

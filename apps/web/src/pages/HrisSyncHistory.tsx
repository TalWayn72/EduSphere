/* eslint-disable edusphere-design-system/require-page-header -- sub-component embedded in HrisConfigPage, not a standalone page */
/**
 * HrisSyncHistory — Sync history table for HRIS configuration page.
 */
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { SyncEntry } from './HrisConfigPage.types';

interface HrisSyncHistoryProps {
  entries: SyncEntry[];
  fetching: boolean;
}

export function HrisSyncHistory({ entries, fetching }: HrisSyncHistoryProps) {
  return (
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
                <th scope="col" className="pb-2 font-medium">
                  Type
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Timestamp
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Users Synced
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Errors
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No sync history yet. Configure an HRIS connection and run a
                    sync.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
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
  );
}

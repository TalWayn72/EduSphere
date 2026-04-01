/**
 * XapiStatementViewer -- Displays recent xAPI statements.
 * Extracted from XapiSettingsPage for file-size compliance.
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface XapiStatement {
  id: string;
  verb: string;
  objectId: string;
  storedAt: string;
}

interface XapiStatementViewerProps {
  statements: XapiStatement[];
}

export function XapiStatementViewer({ statements }: XapiStatementViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Statements</CardTitle>
        <CardDescription>
          Last 20 xAPI statements stored in this LRS
        </CardDescription>
      </CardHeader>
      <CardContent>
        {statements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No statements yet.</p>
        ) : (
          <div className="divide-y text-sm">
            {statements.map((s) => (
              <div key={s.id} className="py-2 flex items-center gap-3">
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
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
  );
}

export type { XapiStatement };

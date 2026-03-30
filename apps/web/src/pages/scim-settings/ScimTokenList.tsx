/**
 * ScimTokenList — displays SCIM API tokens with revoke capability.
 */
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { ScimToken } from './scim-settings.types';

interface ScimTokenListProps {
  tokens: ScimToken[];
  fetching: boolean;
  onGenerateClick: () => void;
  onRevoke: (id: string) => void;
}

export function ScimTokenList({
  tokens,
  fetching,
  onGenerateClick,
  onRevoke,
}: ScimTokenListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Tokens</CardTitle>
          <CardDescription>
            Bearer tokens for HRIS SCIM authentication
          </CardDescription>
        </div>
        <Button size="sm" onClick={onGenerateClick}>
          <Plus className="h-4 w-4 mr-1" /> Generate Token
        </Button>
      </CardHeader>
      <CardContent>
        {fetching ? (
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
                        {' '}&middot; Last used{' '}
                        {new Date(token.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                    {token.expiresAt !== null && (
                      <span>
                        {' '}&middot; Expires{' '}
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
                    onClick={() => void onRevoke(token.id)}
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
  );
}

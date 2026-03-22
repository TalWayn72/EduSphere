/**
 * ApiKeysTable — Existing keys table extracted from ApiKeysPage.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export interface ApiKey {
  id: string;
  description: string;
  prefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeysTableProps {
  keys: ApiKey[];
  fetching: boolean;
  onRevoke: (id: string) => void;
  t: (key: string) => string;
}

export function ApiKeysTable({ keys, fetching, onRevoke, t }: ApiKeysTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('apiKeys.existingTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {fetching ? (
          <p className="p-4 text-sm text-muted-foreground">{t('apiKeys.loading')}</p>
        ) : keys.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t('apiKeys.noKeys')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('apiKeys.colDescription')}</TableHead>
                <TableHead>{t('apiKeys.colPrefix')}</TableHead>
                <TableHead>{t('apiKeys.colCreated')}</TableHead>
                <TableHead>{t('apiKeys.colLastUsed')}</TableHead>
                <TableHead>{t('apiKeys.colStatus')}</TableHead>
                <TableHead>{t('apiKeys.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>{k.description}</TableCell>
                  <TableCell><code className="text-xs">{k.prefix}...</code></TableCell>
                  <TableCell className="text-xs">
                    {new Date(k.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : t('apiKeys.never')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.isActive ? 'default' : 'secondary'}>
                      {k.isActive ? t('apiKeys.active') : t('apiKeys.revoked')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {k.isActive && (
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(k.id)}>
                        {t('apiKeys.revoke')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

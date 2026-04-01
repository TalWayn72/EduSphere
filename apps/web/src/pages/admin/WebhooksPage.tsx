/**
 * WebhooksPage — Webhook configuration for org integrations.
 * Route: /admin/webhooks
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WebhookForm, type WebhookFormData } from './WebhooksPage.form';

const WEBHOOKS_QUERY = `
  query Webhooks { webhooks { id url events active secret createdAt } }
`;
const CREATE_WEBHOOK_MUTATION = `
  mutation CreateWebhook($input: CreateWebhookInput!) {
    createWebhook(input: $input) { id url }
  }
`;
const DELETE_WEBHOOK_MUTATION = `
  mutation DeleteWebhook($id: ID!) { deleteWebhook(id: $id) }
`;

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: string;
}

export function WebhooksPage() {
  const { t } = useTranslation('orgApi');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, reexecute] = useQuery<{ webhooks: Webhook[] }>({
    query: WEBHOOKS_QUERY,
    pause: !mounted,
  });
  const [, createWebhook] = useMutation(CREATE_WEBHOOK_MUTATION);
  const [, deleteWebhook] = useMutation(DELETE_WEBHOOK_MUTATION);

  const onCreate = async (d: WebhookFormData) => {
    await createWebhook({ input: d });
    reexecute({ requestPolicy: 'network-only' });
  };

  const onDelete = async (id: string) => {
    await deleteWebhook({ id });
    reexecute({ requestPolicy: 'network-only' });
  };

  const webhooks = data?.webhooks ?? [];

  return (
    <AdminLayout
      title={t('webhooks.title')}
      description={t('webhooks.description')}
    >
      <h1 className="sr-only">Webhooks</h1>
      <div data-testid="webhooks-page" className="space-y-6">
        <WebhookForm t={t} onSubmit={onCreate} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('webhooks.existingTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {fetching ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t('webhooks.loading')}
              </p>
            ) : webhooks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t('webhooks.noWebhooks')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('webhooks.colUrl')}</TableHead>
                    <TableHead>{t('webhooks.colEvents')}</TableHead>
                    <TableHead>{t('webhooks.colStatus')}</TableHead>
                    <TableHead>{t('webhooks.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="text-xs font-mono">
                        {wh.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {wh.events.map((e) => (
                            <Badge
                              key={e}
                              variant="secondary"
                              className="text-xs"
                            >
                              {e}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={wh.active ? 'default' : 'secondary'}>
                          {wh.active
                            ? t('webhooks.active')
                            : t('webhooks.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(wh.id)}
                        >
                          {t('webhooks.delete')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

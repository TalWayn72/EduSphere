/**
 * ApiKeysPage — API key management for org integrations.
 * Route: /admin/api-keys
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiKeysTable, type ApiKey } from './ApiKeysPage.table';

const API_KEYS_QUERY = `
  query ApiKeys { apiKeys { id description prefix isActive createdAt lastUsedAt } }
`;
const CREATE_KEY_MUTATION = `
  mutation CreateApiKey($input: CreateApiKeyInput!) {
    createApiKey(input: $input) { id token description }
  }
`;
const REVOKE_KEY_MUTATION = `
  mutation RevokeApiKey($id: ID!) { revokeApiKey(id: $id) { id isActive } }
`;

const createSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
});

export function ApiKeysPage() {
  const { t } = useTranslation('orgApi');
  const [mounted, setMounted] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, reexecute] = useQuery<{ apiKeys: ApiKey[] }>({
    query: API_KEYS_QUERY,
    pause: !mounted,
  });
  const [, createKey] = useMutation(CREATE_KEY_MUTATION);
  const [, revokeKey] = useMutation(REVOKE_KEY_MUTATION);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createSchema),
  });

  const onCreate = async (d: { description: string }) => {
    const result = await createKey({ input: d });
    const token = result.data?.createApiKey?.token;
    if (token) {
      setNewToken(token);
      reset();
      reexecute({ requestPolicy: 'network-only' });
    }
  };

  const onRevoke = async (id: string) => {
    await revokeKey({ id });
    reexecute({ requestPolicy: 'network-only' });
  };

  return (
    <AdminLayout
      title={t('apiKeys.title')}
      description={t('apiKeys.description')}
    >
      <h1 className="sr-only">API Keys</h1>
      <div data-testid="api-keys-page" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('apiKeys.createTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onCreate)}
              className="flex gap-3 items-end"
              noValidate
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor="key-desc">
                  {t('apiKeys.descriptionLabel')}
                </Label>
                <Input
                  id="key-desc"
                  {...register('description')}
                  placeholder={t('apiKeys.descriptionPlaceholder')}
                  aria-required="true"
                />
                {errors.description && (
                  <p className="text-destructive text-xs" role="alert">
                    {errors.description.message}
                  </p>
                )}
              </div>
              <Button type="submit">{t('apiKeys.generate')}</Button>
            </form>
          </CardContent>
        </Card>

        {newToken && (
          <Card className="border-green-500 dark:border-green-400">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-700 mb-1 dark:text-green-300">
                {t('apiKeys.tokenCreated')}
              </p>
              <code className="block p-2 bg-muted rounded text-xs break-all font-mono">
                {newToken}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                {t('apiKeys.tokenWarning')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewToken(null)}
              >
                {t('apiKeys.dismiss')}
              </Button>
            </CardContent>
          </Card>
        )}

        <ApiKeysTable
          keys={data?.apiKeys ?? []}
          fetching={fetching}
          onRevoke={onRevoke}
          t={t}
        />
      </div>
    </AdminLayout>
  );
}

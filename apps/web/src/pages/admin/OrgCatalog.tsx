/**
 * OrgCatalog — Org's licensed courses from the marketplace.
 * Route: /admin/catalog
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ORG_CATALOG_QUERY = `
  query OrgCatalog($search: String) {
    orgCatalog(search: $search) {
      id title category licensedAt expiresAt enrollmentCount status
    }
  }
`;

interface CatalogItem {
  id: string;
  title: string;
  category: string;
  licensedAt: string;
  expiresAt: string | null;
  enrollmentCount: number;
  status: string;
}

export function OrgCatalog() {
  const { t } = useTranslation('orgMarketplace');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<{ orgCatalog: CatalogItem[] }>({
    query: ORG_CATALOG_QUERY,
    variables: { search: search || undefined },
    pause: !mounted,
  });

  const items = data?.orgCatalog ?? [];

  return (
    <AdminLayout
      title={t('catalog.title')}
      description={t('catalog.description')}
    >
      <div data-testid="org-catalog-page" className="space-y-6">
        <Input
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label={t('catalog.searchLabel')}
        />

        {fetching ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              {t('catalog.empty')}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('catalog.colTitle')}</TableHead>
                    <TableHead>{t('catalog.colCategory')}</TableHead>
                    <TableHead>{t('catalog.colEnrollments')}</TableHead>
                    <TableHead>{t('catalog.colLicensed')}</TableHead>
                    <TableHead>{t('catalog.colStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>{item.enrollmentCount}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(item.licensedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'active' ? 'text-green-700' : ''
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

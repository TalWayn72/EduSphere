/**
 * JargonManagementPage — Tenant admin page for managing jargon domains and terms.
 * Route: /admin/jargon
 *
 * Layout:
 *   - Left sidebar: DomainsSidebar (tree with parent-child)
 *   - Right content: TermsPanel for selected domain
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthRole } from '@/hooks/useAuthRole';
import { JARGON_DOMAINS_QUERY } from '@/lib/graphql/jargon.queries';
import type { JargonDomain } from '@/types/jargon.types';
import { DomainsSidebar } from './JargonManagementPage.domains';
import { TermsPanel } from './JargonManagementPage.terms';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

export function JargonManagementPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const { t } = useTranslation('admin');
  const [mounted, setMounted] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }, refetch] = useQuery<{
    jargonDomains: JargonDomain[];
  }>({
    query: JARGON_DOMAINS_QUERY,
    pause: !mounted,
  });

  const domains = data?.jargonDomains ?? [];

  const selectedDomain = selectedDomainId
    ? (domains.find((d) => d.id === selectedDomainId) ?? null)
    : null;

  if (!role || !ADMIN_ROLES.has(role)) {
    void navigate('/dashboard');
    return null;
  }

  return (
    <AdminLayout>
      <PageShell size="2xl">
        <PageHeader
          title={t('jargon.management.title', 'Jargon Management')}
          description={t(
            'jargon.management.description',
            'Manage professional domain vocabularies and terms.'
          )}
        />

        <div className="flex gap-6 mt-6 min-h-[600px]">
          {/* Sidebar: domain tree */}
          <div className="w-56 shrink-0 border rounded-lg p-3">
            {fetching ? (
              <LoadingSpinner containerHeight="py-8" />
            ) : (
              <DomainsSidebar
                domains={domains}
                selectedId={selectedDomainId}
                onSelect={setSelectedDomainId}
                onRefetch={() => refetch({ requestPolicy: 'network-only' })}
              />
            )}
          </div>

          {/* Main: terms panel */}
          <div className="flex-1 min-w-0">
            {!selectedDomain ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {t(
                  'jargon.management.selectDomainPrompt',
                  'Select a domain to view its terms.'
                )}
              </div>
            ) : (
              <TermsPanel domain={selectedDomain} />
            )}
          </div>
        </div>
      </PageShell>
    </AdminLayout>
  );
}

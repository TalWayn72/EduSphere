import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { Award } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  CertificateCard,
  type Certificate,
} from '@/components/certificates/CertificateCard';
import {
  MY_CERTIFICATES_QUERY,
  CERTIFICATE_DOWNLOAD_URL_QUERY,
} from '@/lib/graphql/certificate.queries';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MyCertificatesData {
  myCertificates: Certificate[];
}

interface DownloadUrlData {
  certificateDownloadUrl: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CertSkeleton() {
  return (
    <Card className="animate-pulse p-4 space-y-3" data-testid="cert-skeleton">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-full" />
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CertificatesPage() {
  const { t } = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  const [activeCertId, setActiveCertId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery<MyCertificatesData>({
    query: MY_CERTIFICATES_QUERY,
    pause: !mounted,
  });

  const [{ data: downloadData }] = useQuery<DownloadUrlData>({
    query: CERTIFICATE_DOWNLOAD_URL_QUERY,
    variables: { certId: activeCertId ?? '' },
    pause: activeCertId === null,
  });

  useEffect(() => {
    const url = downloadData?.certificateDownloadUrl;
    if (url) {
      window.open(url, '_blank');
      setActiveCertId(null);
    }
  }, [downloadData]);

  const certificates = data?.myCertificates ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-heading">
            {t('certificates.title', 'Certificates')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('certificates.description', 'Your earned course completion certificates.')}
          </p>
        </div>

        {error && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive" data-testid="error-message">
              {t('certificates.errorLoading', 'Failed to load certificates. Please try again later.')}
            </p>
          </Card>
        )}

        {(fetching || !mounted) && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            data-testid="skeleton-grid"
          >
            <CertSkeleton />
            <CertSkeleton />
            <CertSkeleton />
          </div>
        )}

        {mounted && !fetching && !error && certificates.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            data-testid="empty-state"
          >
            <Award className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">
              {t('certificates.empty', 'No certificates yet — complete a course to earn one!')}
            </p>
          </div>
        )}

        {mounted && !fetching && certificates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                cert={cert}
                onDownload={setActiveCertId}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

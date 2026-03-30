/**
 * DomainList — Custom domain list for DomainConfigPage.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SslBadge } from './DomainConfigPage.SslBadge';
import type { CustomDomainRow } from './DomainConfigPage.queries';

interface DomainListProps {
  domains: CustomDomainRow[];
  onCheck: (domain: string) => void;
  onRemove: (domainId: string) => void;
}

export function DomainList({ domains, onCheck, onRemove }: DomainListProps) {
  const { t } = useTranslation('orgAdmin');

  if (domains.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('domains.customDomains', 'Custom Domains')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y" data-testid="domains-list">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between py-3"
              data-testid={`domain-row-${d.domain}`}
            >
              <div className="flex items-center gap-3">
                <code className="text-sm font-mono">{d.domain}</code>
                {d.verifiedAt ? (
                  <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                <SslBadge status={d.sslStatus} />
              </div>
              <div className="flex gap-2">
                {!d.verifiedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCheck(d.domain)}
                  >
                    {t('domains.checkVerification', 'Check')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onRemove(d.id)}
                >
                  {t('common.remove', 'Remove')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

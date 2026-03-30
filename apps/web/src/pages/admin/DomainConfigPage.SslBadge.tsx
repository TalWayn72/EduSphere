/**
 * SslBadge — SSL status badge for DomainConfigPage.
 */
import { Badge } from '@/components/ui/badge';

const SSL_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  provisioning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function SslBadge({ status }: { status: string }) {
  return (
    <Badge className={SSL_COLORS[status] ?? SSL_COLORS.pending} data-testid={`ssl-${status}`}>
      SSL: {status}
    </Badge>
  );
}

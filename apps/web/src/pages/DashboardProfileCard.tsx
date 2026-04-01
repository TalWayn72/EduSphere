import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import type { MeQueryResult } from './Dashboard.types';

interface ProfileCardProps {
  meResult: {
    data?: MeQueryResult;
    fetching: boolean;
  };
  localUser: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role: string;
    tenantId?: string;
  } | null;
}

export function DashboardProfileCard({
  meResult,
  localUser,
}: ProfileCardProps) {
  const { t } = useTranslation('common');

  const profile =
    meResult.data?.me ??
    (localUser
      ? {
          firstName: localUser.firstName,
          lastName: localUser.lastName,
          email: localUser.email,
          role: localUser.role,
          tenantId: localUser.tenantId,
        }
      : null);

  if (meResult.fetching && !localUser) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile')}</CardTitle>
        <CardDescription>{t('accountInformation')}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Name
            </dt>
            <dd className="text-sm mt-1">
              {profile.firstName} {profile.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </dt>
            <dd className="text-sm mt-1">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role
            </dt>
            <dd className="text-sm mt-1">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tenant
            </dt>
            <dd className="text-xs mt-1 font-mono text-muted-foreground truncate">
              {profile.tenantId || '\u2014'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

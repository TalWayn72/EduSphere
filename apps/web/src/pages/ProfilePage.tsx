import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Key,
  BookOpen,
  Trophy,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCurrentUser } from '@/lib/auth';
import { ME_QUERY, COURSES_QUERY } from '@/lib/queries';
import { MY_TOTAL_POINTS_QUERY } from '@/lib/graphql/gamification.queries';
import { MY_ANNOTATIONS_QUERY } from '@/lib/graphql/annotation.queries';
import { BadgesGrid } from '@/components/BadgesGrid';
import { ProfileVisibilityCard } from './ProfileVisibilityCard';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Organization Admin',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
  RESEARCHER: 'Researcher',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ORG_ADMIN: 'bg-orange-100 text-orange-700',
  INSTRUCTOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
  RESEARCHER: 'bg-purple-100 text-purple-700',
};

interface MeQueryResult {
  me: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    preferences: {
      locale: string;
      theme: string;
      emailNotifications: boolean;
      pushNotifications: boolean;
      isPublicProfile?: boolean;
    } | null;
  } | null;
}

interface CoursesQueryResult {
  courses: { id: string }[];
}

interface MyTotalPointsResult {
  myTotalPoints: number;
}

function getInitials(
  firstName: string,
  lastName: string,
  fallback: string
): string {
  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';
  return (first + last).toUpperCase() || (fallback[0] ?? 'U').toUpperCase();
}

export function ProfilePage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const localUser = getCurrentUser();

  const [meResult] = useQuery<MeQueryResult>({ query: ME_QUERY });
  const [coursesResult] = useQuery<CoursesQueryResult>({
    query: COURSES_QUERY,
    variables: { limit: 100, offset: 0 },
  });
  const [pointsResult] = useQuery<MyTotalPointsResult>({
    query: MY_TOTAL_POINTS_QUERY,
  });

  const currentUserId = meResult.data?.me?.id ?? localUser?.id ?? '';
  const [annotationsResult] = useQuery({
    query: MY_ANNOTATIONS_QUERY,
    variables: { userId: currentUserId, limit: 500, offset: 0 },
    pause: !currentUserId,
  });

  if (!localUser) {
    return <Navigate to="/login" replace />;
  }

  // Use real ME_QUERY data when available, fall back to JWT-parsed user
  const firstName = meResult.data?.me?.firstName ?? localUser.firstName;
  const lastName = meResult.data?.me?.lastName ?? localUser.lastName;
  const email = meResult.data?.me?.email ?? localUser.email;
  const role = meResult.data?.me?.role ?? localUser.role;
  const tenantId = meResult.data?.me?.tenantId ?? localUser.tenantId;
  const userId = meResult.data?.me?.id ?? '';
  const preferences = meResult.data?.me?.preferences ?? null;

  const initials = getInitials(firstName, lastName, localUser.username);
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700';
  const coursesCount = coursesResult.data?.courses?.length ?? '—';

  const totalPoints = pointsResult.data?.myTotalPoints;
  const annotationCount = (
    annotationsResult.data as { annotationsByUser?: unknown[] } | undefined
  )?.annotationsByUser?.length;

  const keycloakAccountUrl = `${import.meta.env.VITE_KEYCLOAK_URL ?? ''}/realms/${import.meta.env.VITE_KEYCLOAK_REALM ?? 'edusphere'}/account`;

  const stats = [
    {
      icon: BookOpen,
      label: t('profile.stats.coursesAvailable'),
      value: coursesResult.fetching ? '...' : String(coursesCount),
    },
    {
      icon: Trophy,
      label: 'XP Points',
      value: pointsResult.fetching
        ? '...'
        : totalPoints !== undefined
          ? totalPoints.toLocaleString()
          : '—',
    },
    {
      icon: MessageSquare,
      label: t('profile.stats.annotationsCreated'),
      value: annotationsResult.fetching
        ? '...'
        : annotationCount !== undefined
          ? String(annotationCount)
          : '0',
    },
  ];

  return (
    <Layout>
      <PageShell size="sm">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('common:profile')}</h1>
        </div>

        {/* Identity card */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 text-2xl">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <a
                href={keycloakAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t(
                  'profile.manageAvatar',
                  'Manage avatar in account settings'
                )}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t(
                  'profile.manageAvatar',
                  'Manage avatar in account settings'
                )}
              >
                <ExternalLink className="h-5 w-5 text-white dark:text-white" />
              </a>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold">
                  {firstName} {lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{localUser.username}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}`}
                >
                  {roleLabel}
                </span>
                <a
                  href={keycloakAccountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('profile.manageAccount', 'Manage account')}
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Account details */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('profile.accountDetails')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">
                {t('profile.fields.username')}
              </span>
              <span className="font-medium">{localUser.username}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">
                {t('profile.fields.email')}
              </span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">
                {t('profile.fields.role')}
              </span>
              <span className="font-medium">{roleLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Key className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">
                {t('profile.fields.tenantId')}
              </span>
              <span className="font-mono text-xs text-muted-foreground truncate">
                {tenantId || (
                  <span className="italic text-xs text-muted-foreground/60">
                    {t('profile.fields.tenantIdMissing', 'Not available')}
                  </span>
                )}
              </span>
            </div>
          </div>
        </Card>

        {/* Permissions / Scopes */}
        {localUser.scopes.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {t('profile.permissions')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {localUser.scopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-mono"
                >
                  {scope}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Learning stats */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            {t('profile.learningOverview')}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center space-y-1">
                <div className="flex justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Badges section (F-011) */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Badges Earned
          </h3>
          <BadgesGrid />
        </Card>
        {/* Public Profile visibility toggle (F-022) */}
        {userId && (
          <ProfileVisibilityCard userId={userId} preferences={preferences} />
        )}
      </PageShell>
    </Layout>
  );
}

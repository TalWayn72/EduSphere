/**
 * ManagerDashboardPage — Team progress overview for MANAGER / ORG_ADMIN / SUPER_ADMIN roles.
 * Route: /manager
 * Phase 37: new Manager Dashboard feature.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, AlertTriangle, Star } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { MY_TEAM_OVERVIEW_QUERY } from '@/lib/graphql/manager.queries';

const MANAGER_ROLES = new Set(['MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']);

interface TeamOverview {
  memberCount: number;
  avgCompletionPct: number;
  avgXpThisWeek: number;
  atRiskCount: number;
  topCourseTitle: string | null;
}

interface TeamMember {
  userId: string;
  displayName: string;
  coursesEnrolled: number;
  avgCompletionPct: number;
  totalXp: number;
  level: number;
  lastActiveAt: string | null;
  isAtRisk: boolean;
}

interface TeamQueryData {
  myTeamOverview: TeamOverview;
  myTeamMemberProgress: TeamMember[];
}

export function ManagerDashboardPage() {
  const { t } = useTranslation('admin');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const role = useAuthRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (mounted && role && !MANAGER_ROLES.has(role)) {
      navigate('/dashboard');
    }
  }, [mounted, role, navigate]);

  const [{ data, fetching }] = useQuery<TeamQueryData>({
    query: MY_TEAM_OVERVIEW_QUERY,
    pause: !mounted,
  });

  const overview = data?.myTeamOverview;
  const members = data?.myTeamMemberProgress ?? [];

  if (fetching || !mounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-indigo-500" aria-hidden />
        <h1 className="text-3xl font-bold">{t('manager.title')}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-medium">{t('manager.teamMembers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.memberCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-medium">{t('manager.avgCompletion')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.avgCompletionPct ?? 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
            <CardTitle className="text-sm font-medium">{t('manager.atRiskLearners')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${(overview?.atRiskCount ?? 0) > 0 ? 'text-amber-600' : ''}`}
            >
              {overview?.atRiskCount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" aria-hidden />
            <CardTitle className="text-sm font-medium">{t('manager.avgXpThisWeek')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overview?.avgXpThisWeek ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('manager.teamMembers')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('manager.noMembers')}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4">{t('manager.colName')}</th>
                  <th className="p-4">{t('manager.colCourses')}</th>
                  <th className="p-4">{t('manager.colAvgCompletion')}</th>
                  <th className="p-4">{t('manager.colLevel')}</th>
                  <th className="p-4">{t('manager.colTotalXp')}</th>
                  <th className="p-4">{t('manager.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.userId}
                    className={[
                      'border-b last:border-0 hover:bg-muted/50',
                      m.isAtRisk ? 'bg-amber-50 dark:bg-amber-950/20' : '',
                    ].join(' ')}
                  >
                    <td className="p-4 font-medium">{m.displayName}</td>
                    <td className="p-4 text-sm">{m.coursesEnrolled}</td>
                    <td className="p-4 text-sm">{m.avgCompletionPct}%</td>
                    <td className="p-4">
                      <Badge variant="outline">Lv. {m.level}</Badge>
                    </td>
                    <td className="p-4 text-sm font-semibold text-indigo-600">
                      {m.totalXp.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {m.isAtRisk ? (
                        <Badge variant="destructive" className="text-xs">
                          {t('manager.statusAtRisk')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {t('manager.statusActive')}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

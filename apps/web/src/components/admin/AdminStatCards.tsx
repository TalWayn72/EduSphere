/**
 * AdminStatCards — 3×2 grid of metric stat cards for admin dashboard.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  TrendingUp,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Database,
} from 'lucide-react';
import type { AdminOverviewData } from '@/pages/AdminDashboardPage';

interface StatCard {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
  linkTo?: string;
}

type TFunction = (key: string) => string;

function buildCards(overview: AdminOverviewData, t: TFunction): StatCard[] {
  return [
    {
      id: 'totalUsers',
      label: t('stats.totalUsers'),
      value: overview.totalUsers.toLocaleString(),
      icon: Users,
      colorClass: 'text-blue-600',
    },
    {
      id: 'activeThisMonth',
      label: t('stats.activeThisMonth'),
      value: overview.activeUsersThisMonth.toLocaleString(),
      icon: TrendingUp,
      colorClass: 'text-green-600',
    },
    {
      id: 'totalCourses',
      label: t('stats.totalCourses'),
      value: overview.totalCourses.toLocaleString(),
      icon: BookOpen,
      colorClass: 'text-purple-600',
    },
    {
      id: 'completions30d',
      label: t('stats.completions30d'),
      value: overview.completionsThisMonth.toLocaleString(),
      icon: CheckCircle,
      colorClass: 'text-emerald-600',
    },
    {
      id: 'atRiskLearners',
      label: t('stats.atRiskLearners'),
      value: overview.atRiskCount.toLocaleString(),
      icon: AlertTriangle,
      colorClass: 'text-orange-600',
      linkTo: '/admin/at-risk',
    },
    {
      id: 'storageUsed',
      label: t('stats.storageUsed'),
      value: `${overview.storageUsedMb.toFixed(1)} MB`,
      icon: Database,
      colorClass: 'text-gray-600',
    },
  ];
}

interface AdminStatCardsProps {
  overview: AdminOverviewData;
}

export function AdminStatCards({ overview }: AdminStatCardsProps) {
  const { t } = useTranslation('admin');
  const cards = buildCards(overview, t);

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const inner = (
          <Card
            className={
              card.linkTo
                ? 'hover:border-primary/40 transition-colors cursor-pointer'
                : ''
            }
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`${card.colorClass} shrink-0`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
        return card.linkTo ? (
          <Link key={card.id} to={card.linkTo}>
            {inner}
          </Link>
        ) : (
          <div key={card.id}>{inner}</div>
        );
      })}
    </div>
  );
}

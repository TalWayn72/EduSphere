/**
 * LearnerDetailPanel — Modal panel showing per-learner analytics.
 * Shows course list with completion %, quiz scores, time spent,
 * and an activity timeline (last 30 days).
 * Uses urql query with mounted-guard pattern.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'urql';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const LEARNER_DETAIL_QUERY = `
  query LearnerDetail($userId: ID!) {
    learnerDetail(userId: $userId) {
      userId
      email
      name
      coursesEnrolled
      coursesCompleted
      avgQuizScore
      totalLearningHours
      activityTimeline {
        date
        type
        description
      }
    }
  }
`;

interface ActivityEntry {
  date: string;
  type: string;
  description: string;
}

interface LearnerDetail {
  userId: string;
  email: string;
  name: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  avgQuizScore: number;
  totalLearningHours: number;
  activityTimeline: ActivityEntry[];
}

interface LearnerDetailPanelProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export function LearnerDetailPanel({
  userId,
  open,
  onClose,
}: LearnerDetailPanelProps) {
  const { t } = useTranslation('orgAnalytics');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<{
    learnerDetail: LearnerDetail | null;
  }>({
    query: LEARNER_DETAIL_QUERY,
    variables: { userId: userId ?? '' },
    pause: !mounted || !userId || !open,
  });

  const learner = data?.learnerDetail;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        data-testid="learner-detail-panel"
      >
        <DialogHeader>
          <DialogTitle>
            {learner?.name ?? t('analytics.learnerDetail', 'Learner Detail')}
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : learner ? (
          <div className="space-y-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label={t('analytics.coursesEnrolled', 'Courses Enrolled')}
                value={String(learner.coursesEnrolled)}
              />
              <StatCard
                label={t('analytics.coursesCompleted', 'Completed')}
                value={String(learner.coursesCompleted)}
              />
              <StatCard
                label={t('analytics.avgQuizScore', 'Avg Quiz Score')}
                value={`${learner.avgQuizScore.toFixed(1)}%`}
              />
              <StatCard
                label={t('analytics.learningHours', 'Learning Hours')}
                value={learner.totalLearningHours.toFixed(1)}
              />
            </div>

            {/* Contact Info */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{learner.email}</p>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(
                    'analytics.activityTimeline',
                    'Activity Timeline (30 days)'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {learner.activityTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('analytics.noActivity', 'No recent activity')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {learner.activityTimeline.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-sm border-b pb-2 last:border-0"
                      >
                        <Badge variant="outline" className="text-xs shrink-0">
                          {entry.type}
                        </Badge>
                        <span className="flex-1">{entry.description}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            {t('analytics.learnerNotFound', 'Learner not found')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

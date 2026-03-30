import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminEnrollmentRecord } from './types';
import { formatDate } from './types';

interface EnrollmentTableProps {
  enrollments: AdminEnrollmentRecord[];
  onUnenroll: (userId: string, courseId: string) => void;
}

export function EnrollmentTable({ enrollments, onUnenroll }: EnrollmentTableProps) {
  const { t } = useTranslation('admin');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('enrollment.colUserId')}</TableHead>
          <TableHead>{t('enrollment.colStatus')}</TableHead>
          <TableHead>{t('enrollment.colEnrolled')}</TableHead>
          <TableHead>{t('enrollment.colCompleted')}</TableHead>
          <TableHead className="text-right">{t('enrollment.colActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs">{e.userId}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  e.completedAt
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }
              >
                {e.completedAt ? t('enrollment.completedStatus') : e.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{formatDate(e.enrolledAt)}</TableCell>
            <TableCell className="text-sm">
              {e.completedAt ? formatDate(e.completedAt) : '\u2014'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onUnenroll(e.userId, e.courseId)}
              >
                {t('enrollment.unenroll')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

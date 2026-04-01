/**
 * EnrollmentManagementPage — F-108 Admin Enrollment Management.
 * Route: /admin/enrollment
 * Allows ORG_ADMIN / SUPER_ADMIN to view, enroll, unenroll, and bulk-enroll
 * users per course.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SAVED_CONFIRMATION_MS } from '@/lib/constants';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthRole } from '@/hooks/useAuthRole';
import { COURSES_QUERY } from '@/lib/queries';
import {
  ADMIN_COURSE_ENROLLMENTS_QUERY,
  ADMIN_UNENROLL_USER_MUTATION,
} from '@/lib/graphql/content-tier3.queries';
import type { Course, AdminEnrollmentRecord } from './types';
import { ADMIN_ROLES } from './types';
import { EnrollUserDialog, BulkEnrollDialog } from './EnrollDialogs';
import { EnrollmentTable } from './EnrollmentTable';

export function EnrollmentManagementPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const role = useAuthRole();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmUnenroll, setConfirmUnenroll] = useState<{
    userId: string;
    courseId: string;
  } | null>(null);
  const [, unenrollUser] = useMutation(ADMIN_UNENROLL_USER_MUTATION);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    []
  );

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [coursesResult] = useQuery<{ courses: Course[] }>({
    query: COURSES_QUERY,
    variables: { limit: 200, offset: 0 },
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setMounted(true);
  }, []);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [enrollmentsResult, reexecuteEnrollments] = useQuery<{
    adminCourseEnrollments: AdminEnrollmentRecord[];
  }>({
    query: ADMIN_COURSE_ENROLLMENTS_QUERY,
    variables: { courseId: selectedCourseId },
    pause: !mounted,
  });

  const courses = coursesResult.data?.courses ?? [];
  const enrollments = enrollmentsResult.data?.adminCourseEnrollments ?? [];

  const handleUnenroll = async () => {
    if (!confirmUnenroll) return;
    await unenrollUser(confirmUnenroll);
    setConfirmUnenroll(null);
    reexecuteEnrollments({ requestPolicy: 'network-only' });
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(
      () => setSuccessMessage(''),
      SAVED_CONFIRMATION_MS
    );
  };

  const handleEnrollSuccess = () => {
    reexecuteEnrollments({ requestPolicy: 'network-only' });
    showSuccess(t('enrollment.enrollSuccess'));
  };

  const handleBulkSuccess = (count: number) => {
    reexecuteEnrollments({ requestPolicy: 'network-only' });
    showSuccess(t('enrollment.bulkEnrollSuccess', { count }));
  };

  const completedCount = enrollments.filter((e) => e.completedAt).length;
  const completionRate =
    enrollments.length > 0
      ? Math.round((completedCount / enrollments.length) * 100)
      : 0;

  return (
    <AdminLayout>
      <PageShell size="xl">
        <PageHeader
          title={t('enrollment.pageTitle')}
          description={t('enrollment.pageDescription')}
          breadcrumbs={[
            { label: t('enrollment.breadcrumbAdmin'), href: '/admin' },
            { label: t('enrollment.breadcrumbEnrollment') },
          ]}
        />

        {/* Course selector + actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-72">
              <SelectValue
                placeholder={t('enrollment.selectCoursePlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                  {!c.isPublished && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t('enrollment.draft')}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCourseId && (
            <>
              <Button onClick={() => setShowEnroll(true)} size="sm">
                {t('enrollment.enrollUser')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulk(true)}
                size="sm"
              >
                {t('enrollment.bulkEnroll')}
              </Button>
            </>
          )}

          {successMessage && (
            <span className="text-sm text-green-600 font-medium dark:text-green-400">
              {successMessage}
            </span>
          )}
        </div>

        {/* Stats bar */}
        {selectedCourseId && !enrollmentsResult.fetching && (
          <div className="flex gap-6 mb-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{enrollments.length}</strong>{' '}
              {t('enrollment.enrolledCount')}
            </span>
            <span>
              <strong className="text-foreground">{completedCount}</strong>{' '}
              {t('enrollment.completedCount')}
            </span>
            <span>
              <strong className="text-foreground">{completionRate}%</strong>{' '}
              {t('enrollment.completionRate')}
            </span>
          </div>
        )}

        {/* Enrollments table */}
        {!selectedCourseId ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {t('enrollment.selectCoursePrompt')}
          </div>
        ) : enrollmentsResult.fetching ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {t('enrollment.loadingEnrollments')}
          </div>
        ) : enrollmentsResult.error ? (
          <div className="flex items-center justify-center h-48 text-destructive text-sm">
            {t('enrollment.loadError')}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {t('enrollment.noEnrollments')}
          </div>
        ) : (
          <EnrollmentTable
            enrollments={enrollments}
            onUnenroll={(userId, courseId) =>
              setConfirmUnenroll({ userId, courseId })
            }
          />
        )}

        <EnrollUserDialog
          open={showEnroll}
          courseId={selectedCourseId}
          onClose={() => setShowEnroll(false)}
          onSuccess={handleEnrollSuccess}
        />
        <BulkEnrollDialog
          open={showBulk}
          courseId={selectedCourseId}
          onClose={() => setShowBulk(false)}
          onSuccess={handleBulkSuccess}
        />

        {/* Confirm unenroll dialog */}
        <Dialog
          open={!!confirmUnenroll}
          onOpenChange={(v) => {
            if (!v) setConfirmUnenroll(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('enrollment.confirmUnenrollTitle')}</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm removing enrollment for this user.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              {t('enrollment.confirmUnenrollDesc')}
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmUnenroll(null)}
              >
                {t('enrollment.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleUnenroll}>
                {t('enrollment.unenroll')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </AdminLayout>
  );
}

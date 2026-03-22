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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  ADMIN_ENROLL_USER_MUTATION,
  ADMIN_UNENROLL_USER_MUTATION,
  ADMIN_BULK_ENROLL_MUTATION,
} from '@/lib/graphql/content-tier3.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

interface AdminEnrollmentRecord {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Enroll User Dialog ────────────────────────────────────────────────────────

function EnrollUserDialog({
  open,
  courseId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation('admin');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [, enrollUser] = useMutation(ADMIN_ENROLL_USER_MUTATION);

  const handleEnroll = async () => {
    if (!userId.trim()) {
      setError(t('enrollment.userIdRequired'));
      return;
    }
    const result = await enrollUser({ courseId, userId: userId.trim() });
    if (result.error) {
      console.error('[EnrollmentManagement] Enroll failed:', result.error.message);
      setError(t('enrollment.enrollFailed'));
    } else {
      setUserId('');
      setError('');
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('enrollment.enrollUserTitle')}</DialogTitle>
          <DialogDescription className="sr-only">Enroll a user in the selected course.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder={t('enrollment.userIdPlaceholder')}
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setError('');
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('enrollment.cancel')}
          </Button>
          <Button onClick={handleEnroll}>{t('enrollment.enroll')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Enroll Dialog ────────────────────────────────────────────────────────

function BulkEnrollDialog({
  open,
  courseId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  const { t } = useTranslation('admin');
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState('');
  const [, bulkEnroll] = useMutation(ADMIN_BULK_ENROLL_MUTATION);

  const handleBulkEnroll = async () => {
    const userIds = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      setError(t('enrollment.bulkEnrollMin'));
      return;
    }
    const result = await bulkEnroll({ courseId, userIds });
    if (result.error) {
      console.error('[EnrollmentManagement] Bulk enroll failed:', result.error.message);
      setError(t('enrollment.bulkEnrollFailed'));
    } else {
      const count =
        (result.data as { adminBulkEnroll: number })?.adminBulkEnroll ?? 0;
      setRawInput('');
      setError('');
      onSuccess(count);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('enrollment.bulkEnrollTitle')}</DialogTitle>
          <DialogDescription className="sr-only">Bulk enroll multiple users via CSV input.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {t('enrollment.bulkEnrollDesc')}
          </p>
          <textarea
            className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={t('enrollment.bulkEnrollPlaceholder')}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              setError('');
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('enrollment.cancel')}
          </Button>
          <Button onClick={handleBulkEnroll}>{t('enrollment.enrollAll')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
  useEffect(() => { setMounted(true); }, []);
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

  const handleEnrollSuccess = () => {
    reexecuteEnrollments({ requestPolicy: 'network-only' });
    setSuccessMessage(t('enrollment.enrollSuccess'));
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMessage(''), SAVED_CONFIRMATION_MS);
  };

  const handleBulkSuccess = (count: number) => {
    reexecuteEnrollments({ requestPolicy: 'network-only' });
    setSuccessMessage(t('enrollment.bulkEnrollSuccess', { count }));
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMessage(''), SAVED_CONFIRMATION_MS);
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
          breadcrumbs={[{ label: t('enrollment.breadcrumbAdmin'), href: '/admin' }, { label: t('enrollment.breadcrumbEnrollment') }]}
        />
      {/* Course selector + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder={t('enrollment.selectCoursePlaceholder')} />
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
                <TableCell className="text-sm">
                  {formatDate(e.enrolledAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {e.completedAt ? formatDate(e.completedAt) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setConfirmUnenroll({
                        userId: e.userId,
                        courseId: e.courseId,
                      })
                    }
                  >
                    {t('enrollment.unenroll')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Enroll user dialog */}
      <EnrollUserDialog
        open={showEnroll}
        courseId={selectedCourseId}
        onClose={() => setShowEnroll(false)}
        onSuccess={handleEnrollSuccess}
      />

      {/* Bulk enroll dialog */}
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
            <DialogDescription className="sr-only">Confirm removing enrollment for this user.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t('enrollment.confirmUnenrollDesc')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnenroll(null)}>
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

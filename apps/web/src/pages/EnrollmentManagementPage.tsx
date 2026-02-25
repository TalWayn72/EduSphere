/**
 * EnrollmentManagementPage — F-108 Admin Enrollment Management.
 * Route: /admin/enrollment
 * Allows ORG_ADMIN / SUPER_ADMIN to view, enroll, unenroll, and bulk-enroll
 * users per course.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { AdminLayout } from '@/components/admin/AdminLayout';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthRole } from '@/hooks/useAuthRole';
import { COURSES_QUERY } from '@/lib/queries';
import {
  ADMIN_COURSE_ENROLLMENTS_QUERY,
  ADMIN_ENROLL_USER_MUTATION,
  ADMIN_UNENROLL_USER_MUTATION,
  ADMIN_BULK_ENROLL_MUTATION,
} from '@/lib/graphql/content.queries';

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
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [, enrollUser] = useMutation(ADMIN_ENROLL_USER_MUTATION);

  const handleEnroll = async () => {
    if (!userId.trim()) {
      setError('User ID is required');
      return;
    }
    const result = await enrollUser({ courseId, userId: userId.trim() });
    if (result.error) {
      setError(result.error.message);
    } else {
      setUserId('');
      setError('');
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enroll User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="User ID (UUID)"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setError(''); }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleEnroll}>Enroll</Button>
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
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState('');
  const [, bulkEnroll] = useMutation(ADMIN_BULK_ENROLL_MUTATION);

  const handleBulkEnroll = async () => {
    const userIds = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      setError('Enter at least one User ID');
      return;
    }
    const result = await bulkEnroll({ courseId, userIds });
    if (result.error) {
      setError(result.error.message);
    } else {
      const count = (result.data as { adminBulkEnroll: number })?.adminBulkEnroll ?? 0;
      setRawInput('');
      setError('');
      onSuccess(count);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Enroll Users</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Enter one User ID (UUID) per line, or comma-separated.
          </p>
          <textarea
            className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"user-uuid-1\nuser-uuid-2\nuser-uuid-3"}
            value={rawInput}
            onChange={(e) => { setRawInput(e.target.value); setError(''); }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleBulkEnroll}>Enroll All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function EnrollmentManagementPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmUnenroll, setConfirmUnenroll] = useState<{ userId: string; courseId: string } | null>(null);
  const [, unenrollUser] = useMutation(ADMIN_UNENROLL_USER_MUTATION);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }, []);

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
  const [enrollmentsResult, reexecuteEnrollments] = useQuery<{
    adminCourseEnrollments: AdminEnrollmentRecord[];
  }>({
    query: ADMIN_COURSE_ENROLLMENTS_QUERY,
    variables: { courseId: selectedCourseId },
    pause: !selectedCourseId,
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
    setSuccessMessage('User enrolled successfully');
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBulkSuccess = (count: number) => {
    reexecuteEnrollments({ requestPolicy: 'network-only' });
    setSuccessMessage(`${count} user(s) enrolled successfully`);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccessMessage(''), 3000);
  };

  const completedCount = enrollments.filter((e) => e.completedAt).length;
  const completionRate =
    enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  return (
    <AdminLayout title="Enrollment" description="Manage course enrollments and learning paths">
      {/* Course selector + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select a course…" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
                {!c.isPublished && (
                  <span className="ml-2 text-xs text-muted-foreground">(draft)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedCourseId && (
          <>
            <Button onClick={() => setShowEnroll(true)} size="sm">
              Enroll User
            </Button>
            <Button variant="outline" onClick={() => setShowBulk(true)} size="sm">
              Bulk Enroll
            </Button>
          </>
        )}

        {successMessage && (
          <span className="text-sm text-green-600 font-medium">{successMessage}</span>
        )}
      </div>

      {/* Stats bar */}
      {selectedCourseId && !enrollmentsResult.fetching && (
        <div className="flex gap-6 mb-4 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{enrollments.length}</strong> enrolled
          </span>
          <span>
            <strong className="text-foreground">{completedCount}</strong> completed
          </span>
          <span>
            <strong className="text-foreground">{completionRate}%</strong> completion rate
          </span>
        </div>
      )}

      {/* Enrollments table */}
      {!selectedCourseId ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Select a course above to view and manage enrollments
        </div>
      ) : enrollmentsResult.fetching ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading enrollments…
        </div>
      ) : enrollmentsResult.error ? (
        <div className="flex items-center justify-center h-48 text-destructive text-sm">
          Error loading enrollments: {enrollmentsResult.error.message}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No enrollments yet for this course
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    {e.completedAt ? 'Completed' : e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{formatDate(e.enrolledAt)}</TableCell>
                <TableCell className="text-sm">
                  {e.completedAt ? formatDate(e.completedAt) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmUnenroll({ userId: e.userId, courseId: e.courseId })}
                  >
                    Unenroll
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
      <Dialog open={!!confirmUnenroll} onOpenChange={(v) => { if (!v) setConfirmUnenroll(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Unenroll</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove this user from the course? Their progress data will be preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnenroll(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnenroll}>
              Unenroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

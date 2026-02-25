/**
 * ComplianceReportsPage — ORG_ADMIN compliance training report export.
 * Route: /admin/compliance
 * Access: ORG_ADMIN, SUPER_ADMIN only
 * F-016: Compliance Training Report Export
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  COMPLIANCE_COURSES_QUERY,
  GENERATE_COMPLIANCE_REPORT_MUTATION,
  UPDATE_COURSE_COMPLIANCE_MUTATION,
} from '@/lib/graphql/compliance.queries';
import { ShieldCheck, Download, Loader2, AlertCircle } from 'lucide-react';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface ComplianceCourse {
  id: string;
  title: string;
  slug: string;
  isCompliance: boolean;
  complianceDueDate: string | null;
  isPublished: boolean;
  estimatedHours: number | null;
}

interface ReportResult {
  csvUrl: string;
  pdfUrl: string;
  summary: {
    totalUsers: number;
    totalEnrollments: number;
    completedCount: number;
    completionRate: number;
    overdueCount: number;
    generatedAt: string;
  };
}

export function ComplianceReportsPage() {
  const role = useAuthRole();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [asOfDate, setAsOfDate] = useState('');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  const [{ data, fetching, error }] = useQuery({ query: COMPLIANCE_COURSES_QUERY });
  const [{ fetching: generating }, generateReport] = useMutation(GENERATE_COMPLIANCE_REPORT_MUTATION);
  const [, updateCourseCompliance] = useMutation(UPDATE_COURSE_COMPLIANCE_MUTATION);

  if (!ADMIN_ROLES.has(role ?? '')) {
    void navigate('/dashboard');
    return null;
  }

  const courses: ComplianceCourse[] = data?.complianceCourses ?? [];

  function toggleCourse(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleGenerateReport() {
    const vars = {
      courseIds: Array.from(selectedIds),
      asOf: asOfDate || undefined,
    };
    const res = await generateReport(vars);
    if (res.data?.generateComplianceReport) {
      setReportResult(res.data.generateComplianceReport as ReportResult);
    }
  }

  async function handleToggleCompliance(course: ComplianceCourse) {
    await updateCourseCompliance({
      courseId: course.id,
      isCompliance: !course.isCompliance,
      complianceDueDate: course.complianceDueDate,
    });
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Compliance Training Reports</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Courses</CardTitle>
            <CardDescription>Toggle courses to include in compliance tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching && <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /><span>Loading...</span></div>}
            {error && <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span>{error.message}</span></div>}
            {!fetching && courses.length === 0 && (
              <p className="text-muted-foreground text-sm">No compliance courses configured yet.</p>
            )}
            <div className="space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{course.title}</p>
                    {course.complianceDueDate && (
                      <p className="text-xs text-muted-foreground">Due: {new Date(course.complianceDueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleToggleCompliance(course)}>
                    {course.isCompliance ? 'Remove' : 'Add to Compliance'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select courses and generate a CSV + PDF compliance report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {courses.map((course) => (
                <label key={course.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{course.title}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">As of date (optional)</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-44"
              />
            </div>
            <Button
              onClick={() => void handleGenerateReport()}
              disabled={generating || selectedIds.size === 0}
            >
              {generating ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Generating...</> : 'Generate Report'}
            </Button>

            {reportResult && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <h3 className="font-semibold text-sm">Report Ready</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Total Enrollments:</span>
                  <span>{reportResult.summary.totalEnrollments}</span>
                  <span className="text-muted-foreground">Completion Rate:</span>
                  <span>{reportResult.summary.completionRate.toFixed(1)}%</span>
                  <span className="text-muted-foreground">Overdue:</span>
                  <span className={reportResult.summary.overdueCount > 0 ? 'text-destructive font-medium' : ''}>
                    {reportResult.summary.overdueCount}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={reportResult.csvUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4 mr-1" />CSV
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={reportResult.pdfUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4 mr-1" />PDF
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Download links expire in 1 hour.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

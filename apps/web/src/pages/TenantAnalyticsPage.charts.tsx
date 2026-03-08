/**
 * TenantAnalyticsPage.charts — Recharts visualisations for tenant analytics.
 * Shows active learners trend (AreaChart), completion rate trend (LineChart),
 * and top courses table.
 */
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrendPoint {
  date: string;
  value: number;
}

interface TopCourse {
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
  completionRate: number;
  avgTimeToCompleteHours: number;
}

interface TenantAnalyticsChartsProps {
  activeLearnersTrend: TrendPoint[];
  completionRateTrend: TrendPoint[];
  topCourses: TopCourse[];
}

export function TenantAnalyticsCharts({
  activeLearnersTrend,
  completionRateTrend,
  topCourses,
}: TenantAnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Learners Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activeLearnersTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#6366F1" fill="#6366F133" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Rate Trend (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={completionRateTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10B981" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Top courses table">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Course</th>
                  <th className="pb-2 pr-4 font-medium text-right">Enrollments</th>
                  <th className="pb-2 pr-4 font-medium text-right">Completion %</th>
                  <th className="pb-2 font-medium text-right">Avg Hours</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.map((course) => (
                  <tr key={course.courseId} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{course.courseTitle}</td>
                    <td className="py-2 pr-4 text-right">{course.enrollmentCount}</td>
                    <td className="py-2 pr-4 text-right">
                      {(course.completionRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 text-right">
                      {course.avgTimeToCompleteHours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
                {topCourses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No course data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

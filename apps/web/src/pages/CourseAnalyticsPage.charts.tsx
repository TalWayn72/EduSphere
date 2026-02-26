/**
 * CourseAnalyticsPage.charts — Recharts components for the analytics dashboard.
 * Separated from the main page to stay under the 150-line limit.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContentItemMetric, FunnelStep } from './CourseAnalyticsPage';

interface AnalyticsChartsProps {
  contentItemMetrics: ContentItemMetric[];
  dropOffFunnel: FunnelStep[];
}

// ── Content Item Bar Chart ────────────────────────────────────────────────────

interface ContentItemChartData {
  name: string;
  viewCount: number;
  completionRate: number;
}

function ContentItemChart({ metrics }: { metrics: ContentItemMetric[] }) {
  const data: ContentItemChartData[] = metrics.map((m) => ({
    name: m.title.length > 20 ? `${m.title.slice(0, 18)}…` : m.title,
    viewCount: m.viewCount,
    completionRate: m.completionRate,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Content Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No content item data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Content Item Views</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              // @ts-expect-error Recharts Formatter types are overly strict
              formatter={(value: number | undefined, name: string) =>
                name === 'viewCount'
                  ? [`${value} views`, 'Views']
                  : [`${value}%`, 'Completion']
              }
            />
            <Bar
              dataKey="viewCount"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Drop-off Funnel Chart ─────────────────────────────────────────────────────

function DropOffFunnelChart({ funnel }: { funnel: FunnelStep[] }) {
  const data = funnel.map((s) => ({
    name:
      s.moduleName.length > 18 ? `${s.moduleName.slice(0, 16)}…` : s.moduleName,
    started: s.learnersStarted,
    completed: s.learnersCompleted,
    dropOff: s.dropOffRate,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Module Drop-off Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No funnel data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Module Drop-off Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              // @ts-expect-error Recharts Formatter types are overly strict
              formatter={(value: number | undefined, name: string) =>
                name === 'started'
                  ? [`${value}`, 'Started']
                  : name === 'completed'
                    ? [`${value}`, 'Completed']
                    : [`${value}%`, 'Drop-off Rate']
              }
            />
            <Bar
              dataKey="started"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            >
              {data.map((_entry, i) => (
                <Cell key={i} fill="hsl(var(--primary))" opacity={0.8} />
              ))}
            </Bar>
            <Bar
              dataKey="completed"
              fill="hsl(142 76% 36%)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Exported Composite ────────────────────────────────────────────────────────

export function AnalyticsCharts({
  contentItemMetrics,
  dropOffFunnel,
}: AnalyticsChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ContentItemChart metrics={contentItemMetrics} />
      <DropOffFunnelChart funnel={dropOffFunnel} />
    </div>
  );
}

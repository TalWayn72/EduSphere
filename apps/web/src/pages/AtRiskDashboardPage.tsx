/**
 * AtRiskDashboardPage - Admin at-risk learner monitoring dashboard.
 * Route: /admin/at-risk
 * Uses mock data; admin-level aggregated query is tracked in OPEN_ISSUES.
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "urql";
import { gql } from "urql";
import { AlertTriangle, TrendingDown, Clock, BookOpen, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuthRole } from "@/hooks/useAuthRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AtRiskLearnersTable, type AtRiskLearnerRow } from "@/components/AtRiskLearnersTable";
import { RiskThresholdConfig } from "./AtRiskDashboardPage.config";

const ADMIN_ROLES = new Set(["ORG_ADMIN", "SUPER_ADMIN"]);

const RESOLVE_AT_RISK = gql`
  mutation ResolveAtRiskFlag($flagId: ID!) {
    resolveAtRiskFlag(flagId: $flagId)
  }
`;

const MOCK_LEARNERS: AtRiskLearnerRow[] = [
  { learnerId: "usr-aaa1", courseId: "crs-001", riskScore: 0.87, daysSinceLastActivity: 14, progressPercent: 12, flaggedAt: "2026-02-18T10:00:00Z", riskFactors: [{ key: "inactivity", description: "No activity for 14 days" }, { key: "low_progress", description: "Below 30% completion" }] },
  { learnerId: "usr-bbb2", courseId: "crs-002", riskScore: 0.74, daysSinceLastActivity: 10, progressPercent: 22, flaggedAt: "2026-02-20T08:30:00Z", riskFactors: [{ key: "inactivity", description: "No activity for 10 days" }] },
  { learnerId: "usr-ccc3", courseId: "crs-001", riskScore: 0.63, daysSinceLastActivity: 8, progressPercent: 28, flaggedAt: "2026-02-21T09:15:00Z", riskFactors: [{ key: "low_progress", description: "Below 30% completion" }] },
  { learnerId: "usr-ddd4", courseId: "crs-003", riskScore: 0.55, daysSinceLastActivity: 7, progressPercent: 31, flaggedAt: "2026-02-22T11:00:00Z", riskFactors: [{ key: "quiz_failures", description: "Failed last 2 quizzes" }] },
  { learnerId: "usr-eee5", courseId: "crs-002", riskScore: 0.42, daysSinceLastActivity: 5, progressPercent: 45, flaggedAt: "2026-02-23T14:00:00Z", riskFactors: [{ key: "low_engagement", description: "Below average session time" }] },
  { learnerId: "usr-fff6", courseId: "crs-004", riskScore: 0.91, daysSinceLastActivity: 21, progressPercent: 5, flaggedAt: "2026-02-15T07:00:00Z", riskFactors: [{ key: "inactivity", description: "No activity for 21 days" }, { key: "low_progress", description: "Below 30% completion" }] },
];

type RiskFilter = "all" | "high" | "medium" | "low";
type SortKey = "risk" | "inactive" | "progress";

function applyFilter(rows: AtRiskLearnerRow[], filter: RiskFilter): AtRiskLearnerRow[] {
  if (filter === "high") return rows.filter((r) => r.riskScore > 0.7);
  if (filter === "medium") return rows.filter((r) => r.riskScore >= 0.5 && r.riskScore <= 0.7);
  if (filter === "low") return rows.filter((r) => r.riskScore < 0.5);
  return rows;
}

function applySort(rows: AtRiskLearnerRow[], sort: SortKey): AtRiskLearnerRow[] {
  const copy = [...rows];
  if (sort === "risk") copy.sort((a, b) => b.riskScore - a.riskScore);
  if (sort === "inactive") copy.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
  if (sort === "progress") copy.sort((a, b) => a.progressPercent - b.progressPercent);
  return copy;
}

function exportCsv(rows: AtRiskLearnerRow[]) {
  const header = "learnerId,courseId,riskScore,daysSinceLastActivity,progressPercent,flaggedAt";
  const body = rows
    .map((r) => [r.learnerId, r.courseId, r.riskScore, r.daysSinceLastActivity, r.progressPercent, r.flaggedAt].join(","))
    .join(String.fromCharCode(10));
  const blob = new Blob([header + String.fromCharCode(10) + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "at-risk-learners.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function AtRiskDashboardPage() {
  const navigate = useNavigate();
  const role = useAuthRole();
  const [, resolveFlag] = useMutation(RESOLVE_AT_RISK);
  const [learners, setLearners] = useState<AtRiskLearnerRow[]>(MOCK_LEARNERS);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [sort, setSort] = useState<SortKey>("risk");

  const visible = useMemo(
    () => applySort(applyFilter(learners, filter), sort),
    [learners, filter, sort],
  );

  const stats = useMemo(() => ({
    total: learners.length,
    high: learners.filter((r) => r.riskScore > 0.7).length,
    avgInactive: learners.length
      ? Math.round(learners.reduce((s, r) => s + r.daysSinceLastActivity, 0) / learners.length)
      : 0,
    courses: new Set(learners.map((r) => r.courseId)).size,
  }), [learners]);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate("/dashboard");
    return null;
  }

  async function handleResolve(learnerId: string, courseId: string) {
    const key = learnerId + courseId;
    setResolving(key);
    await resolveFlag({ flagId: key });
    setLearners((prev) =>
      prev.filter((r) => !(r.learnerId === learnerId && r.courseId === courseId)),
    );
    setResolving(null);
    toast.success("Learner flag resolved");
  }

  const statCards = [
    { icon: AlertTriangle, label: "Total At-Risk", value: stats.total, color: "text-orange-500" },
    { icon: TrendingDown, label: "High Risk (>70%)", value: stats.high, color: "text-red-500" },
    { icon: Clock, label: "Avg Days Inactive", value: stats.avgInactive + "d", color: "text-yellow-500" },
    { icon: BookOpen, label: "Courses Affected", value: stats.courses, color: "text-blue-500" },
  ] as const;

  return (
    <AdminLayout
      title="At-Risk Learners"
      description="Identify and support learners who may need intervention"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center gap-2">
                <Icon className={"h-4 w-4 " + color} />
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as RiskFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="high">High (&gt;70%)</SelectItem>
              <SelectItem value="medium">Medium (50-70%)</SelectItem>
              <SelectItem value="low">Low (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Risk Score (highest first)</SelectItem>
              <SelectItem value="inactive">Days Inactive (most first)</SelectItem>
              <SelectItem value="progress">Progress (lowest first)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => exportCsv(visible)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardContent className="pt-4">
            <AtRiskLearnersTable
              learners={visible}
              onResolve={handleResolve}
              resolving={resolving}
            />
          </CardContent>
        </Card>

        <RiskThresholdConfig />
      </div>
    </AdminLayout>
  );
}

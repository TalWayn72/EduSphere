import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Target, CheckCircle2 } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-3">
        <span className="text-primary">{icon}</span>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function ExamAnalyticsDashboard() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Exam Analytics</h1>
        <p className="text-sm text-muted-foreground">Course: {courseId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total Exams Taken"
          value="—"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Average Score"
          value="—"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Pass Rate"
          value="—"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Live data will appear here once the exam service API is connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

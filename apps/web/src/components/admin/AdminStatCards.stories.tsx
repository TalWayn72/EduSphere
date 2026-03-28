import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, TrendingUp, BookOpen, CheckCircle, AlertTriangle, Database } from 'lucide-react';

function StatCard({ label, value, icon: Icon, colorClass }: {
  label: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const meta: Meta = {
  title: 'Admin/StatCards',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Total Users" value="12,458" icon={Users} colorClass="bg-blue-100 text-blue-600" />
      <StatCard label="Revenue" value="$84,230" icon={TrendingUp} colorClass="bg-green-100 text-green-600" />
      <StatCard label="Active Courses" value="342" icon={BookOpen} colorClass="bg-purple-100 text-purple-600" />
      <StatCard label="Completion Rate" value="78%" icon={CheckCircle} colorClass="bg-emerald-100 text-emerald-600" />
      <StatCard label="At Risk" value="23" icon={AlertTriangle} colorClass="bg-amber-100 text-amber-600" />
      <StatCard label="Storage" value="2.4 TB" icon={Database} colorClass="bg-slate-100 text-slate-600" />
    </div>
  ),
};

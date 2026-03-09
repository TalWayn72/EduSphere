/**
 * DropOffFunnelChart — Bar chart showing per-module drop-off rates.
 * Colors: red >50%, amber 25-50%, green <25%.
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface DropOffPoint {
  moduleName: string;
  dropOffRate: number; // 0–100
}

interface Props {
  data: DropOffPoint[];
}

function cellColor(rate: number): string {
  if (rate > 50) return '#EF4444';
  if (rate > 25) return '#F59E0B';
  return '#10B981';
}

export function DropOffFunnelChart({ data }: Props) {
  if (!data.length) {
    return (
      <p className="text-muted-foreground text-sm">No funnel data available.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, bottom: 40, left: 0 }}
      >
        <XAxis
          dataKey="moduleName"
          angle={-30}
          textAnchor="end"
          interval={0}
          tick={{ fontSize: 11 }}
        />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip formatter={(v) => [`${v}%`, 'Drop-off Rate']} />
        <Bar dataKey="dropOffRate" name="Drop-off Rate">
          {data.map((entry, index) => (
            <Cell key={index} fill={cellColor(entry.dropOffRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

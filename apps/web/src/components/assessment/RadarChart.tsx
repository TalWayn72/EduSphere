/**
 * AssessmentRadarChart — renders a radar/spider chart for 360° assessment results.
 * Uses recharts. Accessible via aria-label on the container.
 */
import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface RadarChartCriterion {
  name: string;
  score: number;
  maxScore: number;
}

interface RadarChartProps {
  criteria: RadarChartCriterion[];
  ariaLabel?: string;
}

export function AssessmentRadarChart({ criteria, ariaLabel = 'Assessment radar chart' }: RadarChartProps) {
  const data = criteria.map((c) => ({
    subject: c.name,
    A: c.score,
    fullMark: c.maxScore,
  }));

  return (
    <div role="img" aria-label={ariaLabel} className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | string | undefined) =>
              [typeof value === 'number' ? value.toFixed(1) : String(value ?? ''), 'Score']
            }
          />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AssessmentRadarChart;

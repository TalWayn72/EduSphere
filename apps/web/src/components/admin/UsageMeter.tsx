/**
 * UsageMeter — Circular SVG progress meter showing YAU utilization.
 * Pure SVG, no external library, no timers.
 */
import React from 'react';

interface UsageMeterProps {
  current: number;
  limit: number;
  label?: string;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 339.3

function getStrokeColor(ratio: number): string {
  if (ratio >= 1.0) return '#ef4444'; // red-500
  if (ratio >= 0.8) return '#eab308'; // yellow-500
  return '#22c55e'; // green-500
}

export function UsageMeter({ current, limit, label }: UsageMeterProps) {
  const ratio = limit > 0 ? Math.min(current / limit, 1) : 0;
  const pct = limit > 0 ? Math.round((current / limit) * 100) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
  const strokeColor = getStrokeColor(limit > 0 ? current / limit : 0);

  return (
    <div
      data-testid="usage-meter"
      className="flex flex-col items-center gap-2"
      role="img"
      aria-label={label ?? `Usage: ${current} of ${limit}`}
    >
      <svg
        width="128"
        height="128"
        viewBox="0 0 128 128"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/30"
        />
        {/* Progress arc */}
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        {/* Center text: current */}
        <text
          x="64"
          y="58"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="18"
          fontWeight="700"
          fill="currentColor"
          className="fill-foreground"
          data-testid="usage-meter-current"
        >
          {current}
        </text>
        {/* Center text: / limit */}
        <text
          x="64"
          y="76"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill="currentColor"
          className="fill-muted-foreground"
        >
          / {limit}
        </text>
      </svg>

      {/* Pct label */}
      <p
        data-testid="usage-meter-pct"
        className="text-sm text-muted-foreground"
      >
        {pct}% utilized
      </p>

      {label && (
        <p className="text-xs font-medium text-center">{label}</p>
      )}
    </div>
  );
}

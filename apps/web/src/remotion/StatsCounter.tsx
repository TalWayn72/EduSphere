import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface StatsCounterProps {
  targetValue?: number;
  label?: string;
  suffix?: string;
}

export function StatsCounter({
  targetValue = 500000,
  label = 'Active Learners',
  suffix = '+',
}: StatsCounterProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  const displayValue = Math.round(interpolate(progress, [0, 1], [0, targetValue]));

  const formatted = new Intl.NumberFormat('en-US').format(displayValue);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <span
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#6366f1',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1,
        }}
      >
        {formatted}
        {suffix}
      </span>
      <span
        style={{
          fontSize: 18,
          color: '#94a3b8',
          marginTop: 8,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {label}
      </span>
    </AbsoluteFill>
  );
}

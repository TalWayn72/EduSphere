import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Orb {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

const ORBS: Orb[] = [
  { x: 20, y: 30, radius: 300, color: '#6366f1', speed: 0.3 },
  { x: 70, y: 60, radius: 250, color: '#8b5cf6', speed: 0.2 },
  { x: 50, y: 80, radius: 200, color: '#3b82f6', speed: 0.4 },
  { x: 85, y: 20, radius: 180, color: '#06b6d4', speed: 0.25 },
];

function FloatingOrb({ orb, frame }: { orb: Orb; frame: number }) {
  const xOffset = Math.sin(frame * orb.speed * 0.02) * 30;
  const yOffset = Math.cos(frame * orb.speed * 0.015) * 20;
  const opacity = interpolate(frame, [0, 30], [0, 0.6], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${orb.x + xOffset * 0.1}%`,
        top: `${orb.y + yOffset * 0.1}%`,
        width: orb.radius * 2,
        height: orb.radius * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${orb.color}66 0%, ${orb.color}00 70%)`,
        transform: 'translate(-50%, -50%)',
        opacity,
      }}
    />
  );
}

export function HeroBackground() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const gradientAngle = interpolate(progress, [0, 1], [135, 225]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0f0c29, #302b63, #24243e)`,
        overflow: 'hidden',
      }}
    >
      {ORBS.map((orb, i) => (
        <FloatingOrb key={i} orb={orb} frame={frame} />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </AbsoluteFill>
  );
}

import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

const MILESTONES = [
  { label: 'Week 1 ✓', xPct: 22, delay: 30 },
  { label: 'Month 1 ✓', xPct: 50, delay: 65 },
  { label: 'Course ✓', xPct: 73, delay: 95 },
  { label: '🏆 Expert', xPct: 90, delay: 130 },
];

// ── Main composition (180 frames = 6 s @ 30 fps, 800 × 150) ──────────────────
export function ProgressJourney() {
  const frame = useCurrentFrame();

  const fillPct = interpolate(frame, [0, 155], [0, 90], { extrapolateRight: 'clamp' });
  const xp = Math.round(interpolate(frame, [0, 155], [0, 2840], { extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 60px', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* XP badge */}
      <div style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 700, marginBottom: 10, alignSelf: 'flex-end' }}>
        ⚡ {xp.toLocaleString()} XP
      </div>

      {/* Progress track */}
      <div style={{ position: 'relative', width: '100%', height: 24 }}>
        {/* Background */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', transform: 'translateY(-50%)',
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, width: `${fillPct}%`,
          height: 6, borderRadius: 3, transform: 'translateY(-50%)',
          background: 'linear-gradient(90deg,#6366f1,#06b6d4)',
          boxShadow: '0 0 14px #6366f180',
        }} />
        {/* Milestone dots */}
        {MILESTONES.map((m) => {
          const lf = Math.max(0, frame - m.delay);
          const scale = spring({ frame: lf, fps: 30, config: { damping: 12, stiffness: 160 } });
          const reached = fillPct >= m.xPct;
          return (
            <div key={m.label} style={{
              position: 'absolute', top: '50%', left: `${m.xPct}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: reached ? '#06b6d4' : 'rgba(255,255,255,0.15)',
                border: `2px solid ${reached ? '#06b6d4' : 'rgba(255,255,255,0.25)'}`,
                boxShadow: reached ? '0 0 10px #06b6d480' : 'none',
              }} />
            </div>
          );
        })}
      </div>

      {/* Labels row */}
      <div style={{ position: 'relative', width: '100%', height: 28, marginTop: 8 }}>
        {MILESTONES.map((m) => {
          const lf = Math.max(0, frame - m.delay);
          const opacity = interpolate(lf, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={m.label} style={{
              position: 'absolute', left: `${m.xPct}%`, transform: 'translateX(-50%)',
              color: '#a5b4fc', fontSize: 11, fontWeight: 600,
              opacity, whiteSpace: 'nowrap',
            }}>
              {m.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

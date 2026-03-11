import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

const STEPS = [
  { num: '01', title: 'Sign Up', desc: 'Create your account', icon: '👤', color: '#6366f1', delay: 25 },
  { num: '02', title: 'Set Goals', desc: 'Choose your learning path', icon: '🎯', color: '#8b5cf6', delay: 85 },
  { num: '03', title: 'Start Learning', desc: 'AI adapts to you instantly', icon: '🚀', color: '#06b6d4', delay: 145 },
];

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ step, frame }: { step: (typeof STEPS)[0]; frame: number }) {
  const lf = Math.max(0, frame - step.delay);
  const scale = spring({ frame: lf, fps: 30, config: { damping: 13, stiffness: 100, mass: 0.8 } });
  const checkOpacity = interpolate(lf, [28, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      opacity: scale, transform: `scale(${scale})`,
    }}>
      {/* Icon circle */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: `${step.color}20`, border: `2px solid ${step.color}80`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, position: 'relative',
      }}>
        {step.icon}
        {/* Check badge */}
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 24, height: 24, borderRadius: '50%',
          background: '#10b981', border: '2px solid #0f1117',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: 'white', fontWeight: 700,
          opacity: checkOpacity,
        }}>
          ✓
        </div>
      </div>
      <div style={{ color: step.color, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{step.num}</div>
      <div style={{ color: 'white', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>{step.title}</div>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 1.4 }}>{step.desc}</div>
    </div>
  );
}

// ── Connector line ────────────────────────────────────────────────────────────
function Connector({ frame, delay }: { frame: number; delay: number }) {
  const lf = Math.max(0, frame - delay);
  const width = interpolate(lf, [0, 35], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      width: 120, height: 2, marginBottom: 50, flexShrink: 0,
      background: `linear-gradient(90deg, rgba(99,102,241,${width / 120}), rgba(6,182,212,${width / 120}))`,
      borderRadius: 1, alignSelf: 'center',
    }} />
  );
}

// ── Main composition (300 frames = 10 s @ 30 fps, 1920 × 400) ────────────────
export function OnboardingSpeed() {
  const frame = useCurrentFrame();
  const timerOpacity = interpolate(frame, [220, 240], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg,#3730a3,#4f46e5,#6366f1)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 44, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
        Get started in under 60 seconds
      </div>

      {/* Steps row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        {STEPS.map((step, i) => (
          <>
            <StepCard key={step.num} step={step} frame={frame} />
            {i < STEPS.length - 1 && (
              <Connector key={`c${i}`} frame={frame} delay={step.delay + 40} />
            )}
          </>
        ))}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 600, letterSpacing: 2, opacity: timerOpacity }}>
        ⏱ Average onboarding: 45 seconds
      </div>
    </AbsoluteFill>
  );
}

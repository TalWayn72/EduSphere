import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

// ── Content ───────────────────────────────────────────────────────────────────
const QUESTION = 'Why did the Roman Empire fall?';
const ANSWER =
  "Great question! The fall involved multiple factors: economic pressures from overextension, military strain at the borders, and political instability. Let's explore each concept...";
const TAGS = [
  { label: 'Economics', color: '#f59e0b' },
  { label: 'Military', color: '#ef4444' },
  { label: 'Politics', color: '#6366f1' },
  { label: 'Culture', color: '#10b981' },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function Tag({ label, color, scale }: { label: string; color: string; scale: number }) {
  return (
    <div style={{
      background: `${color}22`, border: `1px solid ${color}66`, borderRadius: 20,
      padding: '4px 14px', color, fontSize: 12, fontWeight: 600,
      opacity: scale, transform: `scale(${scale})`, transformOrigin: 'left center',
    }}>
      {label}
    </div>
  );
}

// ── Main composition (240 frames = 8 s @ 30 fps, 600 × 400) ──────────────────
export function AIChavrutaTyping() {
  const frame = useCurrentFrame();

  const qChars = Math.floor(
    interpolate(frame, [20, 80], [0, QUESTION.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const aChars = Math.floor(
    interpolate(frame, [100, 220], [0, ANSWER.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

  const bubbleIn = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const aiBubbleIn = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const blink = Math.floor(frame / 8) % 2 === 0;
  const showQCursor = frame > 20 && frame < 82 && blink;
  const showACursor = frame > 100 && frame < 222 && blink;

  const tagScales = TAGS.map((_, i) =>
    spring({ frame: frame - (185 + i * 10), fps: 30, config: { damping: 12, stiffness: 120 } }),
  );

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
      display: 'flex', flexDirection: 'column',
      padding: 28, fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>AI</span>
        </div>
        <span style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 600 }}>Chavruta — AI Learning Partner</span>
        <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
      </div>

      {/* User bubble */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, opacity: bubbleIn }}>
        <div style={{
          background: '#6366f1', borderRadius: '18px 18px 4px 18px',
          padding: '10px 16px', maxWidth: '80%', color: 'white', fontSize: 14, lineHeight: 1.5,
        }}>
          {QUESTION.slice(0, qChars)}{showQCursor ? '|' : ''}
        </div>
      </div>

      {/* AI bubble */}
      {frame > 88 && (
        <div style={{ display: 'flex', gap: 8, opacity: aiBubbleIn, flex: 1 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#4f46e5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>AI</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.07)', borderRadius: '4px 18px 18px 18px',
            padding: '10px 16px', maxWidth: '88%', color: '#e0e7ff', fontSize: 13, lineHeight: 1.65,
          }}>
            {ANSWER.slice(0, aChars)}{showACursor ? '|' : ''}
          </div>
        </div>
      )}

      {/* Concept tags */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        {TAGS.map((tag, i) => (
          <Tag key={tag.label} label={tag.label} color={tag.color} scale={tagScales[i] ?? 0} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

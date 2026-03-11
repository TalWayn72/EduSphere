import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

// ── Document lines ────────────────────────────────────────────────────────────
const DOC_LINES = [
  { text: 'Introduction to Neural Networks', heading: true },
  { text: '' },
  { text: 'Neural networks are computing systems inspired by biological', heading: false },
  { text: 'neural networks. These systems learn to perform tasks by', heading: false },
  { text: 'considering examples — without explicit task-specific rules.', heading: false },
  { text: '' },
  { text: 'Key concepts:', heading: false },
  { text: '  Layers · Weights · Activation Functions · Backprop', highlight: true },
  { text: '' },
  { text: 'The first layer receives raw input, processes it through', heading: false },
  { text: 'weights, and passes results to subsequent layers.', heading: false },
];

const KG_NODES = ['Neural Networks', 'Weights & Bias', 'Backpropagation', 'Activation Fn.', 'Deep Learning'];
const NODE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

// ── Panel component ───────────────────────────────────────────────────────────
function Panel({
  title, role, highlightOpacity, commentVisible, commentScale,
}: {
  title: string; role: 'instructor' | 'student';
  highlightOpacity: number; commentVisible: boolean; commentScale: number;
}) {
  return (
    <div style={{
      flex: 1, background: '#1e1e2e', borderRadius: 12, padding: 22,
      display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.07)',
      position: 'relative', fontFamily: 'system-ui, sans-serif', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: role === 'instructor' ? '#10b981' : '#6366f1' }} />
        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>{title}</span>
        <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 10 }}>
          {role === 'instructor' ? '📝 Instructor' : '👤 Student'}
        </span>
      </div>
      {/* Document */}
      <div style={{ flex: 1 }}>
        {DOC_LINES.map((l, i) => (
          <div key={i} style={{
            fontSize: l.heading ? 14 : 12, fontWeight: l.heading ? 700 : 400,
            color: l.heading ? '#e2e8f0' : '#94a3b8',
            lineHeight: 1.85, paddingLeft: 8,
            background: l.highlight ? `rgba(251,191,36,${highlightOpacity * 0.22})` : 'transparent',
            borderLeft: l.highlight ? `3px solid rgba(251,191,36,${highlightOpacity})` : '3px solid transparent',
            borderRadius: 2, marginBottom: 1,
          }}>
            {l.text || '\u00A0'}
          </div>
        ))}
      </div>
      {/* Comment bubble */}
      {commentVisible && (
        <div style={{
          position: 'absolute', bottom: 18, right: 18,
          background: '#6366f1', borderRadius: '16px 16px 4px 16px',
          padding: '9px 14px', maxWidth: 200,
          color: 'white', fontSize: 11, lineHeight: 1.5,
          boxShadow: '0 6px 20px rgba(99,102,241,0.45)',
          transform: `scale(${commentScale})`, transformOrigin: 'bottom right',
        }}>
          💬 These 4 concepts map directly to our knowledge graph!
        </div>
      )}
    </div>
  );
}

// ── Main composition (750 frames = 25 s @ 30 fps, 1280 × 720) ────────────────
export function LiveCollab() {
  const frame = useCurrentFrame();

  const leftIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rightIn = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const instrHighlight = interpolate(frame, [148, 168], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const studHighlight = interpolate(frame, [218, 238], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const syncOpacity = interpolate(frame, [155, 170, 220, 235], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const commentScale = spring({ frame: Math.max(0, frame - 380), fps: 30, config: { damping: 14, stiffness: 100 } });

  const kgSlide = interpolate(frame, [550, 590], [280, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#0f1117', fontFamily: 'system-ui, sans-serif', padding: 28, boxSizing: 'border-box' }}>
      {/* Session header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 7px #10b981' }} />
        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>EduSphere Live · Intro to Neural Networks</span>
        <div style={{ marginLeft: 'auto', color: '#475569', fontSize: 11 }}>👥 24 online</div>
      </div>

      <div style={{ display: 'flex', gap: 18, flex: 1, overflow: 'hidden' }}>
        {/* Instructor panel */}
        <div style={{ flex: 1, opacity: leftIn }}>
          <Panel title="Course Document" role="instructor"
            highlightOpacity={instrHighlight} commentVisible={frame > 378} commentScale={commentScale} />
        </div>

        {/* Sync indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, width: 30, opacity: syncOpacity }}>
          <div style={{ width: 2, height: 50, background: 'linear-gradient(to bottom, transparent, #6366f1, transparent)' }} />
          <span style={{ color: '#6366f1', fontSize: 9, fontWeight: 700, letterSpacing: 1, writingMode: 'vertical-rl' }}>LIVE</span>
          <div style={{ width: 2, height: 50, background: 'linear-gradient(to bottom, transparent, #6366f1, transparent)' }} />
        </div>

        {/* Student panel */}
        <div style={{ flex: 1, opacity: rightIn }}>
          <Panel title="Student View" role="student"
            highlightOpacity={studHighlight} commentVisible={false} commentScale={0} />
        </div>

        {/* Knowledge graph sidebar */}
        {frame > 540 && (
          <div style={{
            width: 210, background: '#1a1a2e', borderRadius: 12, padding: 16,
            border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0,
            transform: `translateX(${kgSlide}px)`,
          }}>
            <div style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>🕸 Knowledge Graph</div>
            {KG_NODES.map((concept, i) => {
              const op = interpolate(frame - 558 - i * 14, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={concept} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, opacity: op }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS[i] }} />
                  <span style={{ color: '#cbd5e1', fontSize: 11 }}>{concept}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

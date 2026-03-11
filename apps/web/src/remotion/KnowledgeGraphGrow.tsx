import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// ── Node / Edge data ───────────────────────────────────────────────────────────
const NODES = [
  { id: 0, label: 'Knowledge Graph', x: 960, y: 540, color: '#6366f1', r: 55, delay: 0 },
  { id: 1, label: 'Memory', x: 500, y: 300, color: '#8b5cf6', r: 40, delay: 30 },
  { id: 2, label: 'Active Recall', x: 1420, y: 300, color: '#06b6d4', r: 40, delay: 60 },
  { id: 3, label: 'Spaced Rep.', x: 340, y: 630, color: '#3b82f6', r: 38, delay: 90 },
  { id: 4, label: 'Metacognition', x: 1580, y: 630, color: '#10b981', r: 38, delay: 120 },
  { id: 5, label: 'Scaffolding', x: 590, y: 820, color: '#f59e0b', r: 35, delay: 150 },
  { id: 6, label: 'Growth Mindset', x: 1330, y: 820, color: '#ec4899', r: 35, delay: 180 },
  { id: 7, label: 'Learning Theory', x: 960, y: 190, color: '#14b8a6', r: 42, delay: 210 },
  { id: 8, label: 'Neural Pathways', x: 960, y: 900, color: '#f97316', r: 35, delay: 240 },
];

const EDGES = [
  { from: 0, to: 1, delay: 45 }, { from: 0, to: 2, delay: 75 },
  { from: 0, to: 3, delay: 105 }, { from: 0, to: 4, delay: 135 },
  { from: 0, to: 5, delay: 165 }, { from: 0, to: 6, delay: 195 },
  { from: 0, to: 7, delay: 225 }, { from: 0, to: 8, delay: 255 },
  { from: 1, to: 7, delay: 270 }, { from: 2, to: 4, delay: 282 },
  { from: 3, to: 5, delay: 294 }, { from: 6, to: 8, delay: 306 },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function GraphNode({ node, frame, fps }: { node: (typeof NODES)[0]; frame: number; fps: number }) {
  const lf = Math.max(0, frame - node.delay);
  const scale = spring({ frame: lf, fps, config: { damping: 15, stiffness: 120, mass: 0.5 } });
  const labelOpacity = interpolate(lf, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <g>
      {/* Glow ring */}
      <circle cx={node.x} cy={node.y} r={(node.r + 10) * scale} fill="none"
        stroke={node.color} strokeWidth={1.5} opacity={0.35} />
      {/* Core */}
      <circle cx={node.x} cy={node.y} r={node.r * scale} fill={node.color} opacity={0.92} />
      {/* Label */}
      <text x={node.x} y={node.y + node.r + 22} textAnchor="middle"
        fill="white" fontSize={14} fontFamily="system-ui, sans-serif"
        fontWeight={600} opacity={labelOpacity}>
        {node.label}
      </text>
    </g>
  );
}

function GraphEdge({ edge, frame }: { edge: (typeof EDGES)[0]; frame: number }) {
  const from = NODES[edge.from]!;
  const to = NODES[edge.to]!;
  const lf = Math.max(0, frame - edge.delay);
  const len = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
  const dashOffset = interpolate(lf, [0, 25], [len, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = interpolate(lf, [0, 6], [0, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
      stroke={from.color} strokeWidth={1.8}
      strokeDasharray={len} strokeDashoffset={dashOffset} opacity={opacity} />
  );
}

// ── Main composition (360 frames = 12 s @ 30 fps, 1920 × 1080) ───────────────
export function KnowledgeGraphGrow() {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const angle = interpolate(progress, [0, 1], [135, 225]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg,#0f0c29,#302b63,#24243e)`, overflow: 'hidden' }}>
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        {EDGES.map((e, i) => <GraphEdge key={i} edge={e} frame={frame} />)}
        {NODES.map((n) => <GraphNode key={n.id} node={n} frame={frame} fps={fps} />)}
      </svg>
      {/* Depth vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)',
      }} />
    </AbsoluteFill>
  );
}

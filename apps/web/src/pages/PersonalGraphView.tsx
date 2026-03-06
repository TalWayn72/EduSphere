/**
 * PersonalGraphView — SVG visualization of the user's personal annotation wiki.
 *
 * Shows personal annotations as nodes across all courses, connected by shared
 * concepts. This implements PRD §4.4 (Personal Knowledge Graph / private wiki).
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import {
  mockPersonalNodes,
  mockPersonalEdges,
  PersonalGraphNode,
} from '@/lib/mock-personal-graph';

const SVG_W = 520, SVG_H = 380, CX = 260, CY = 195, R = 155;

const COURSE_COLORS: Record<string, string> = {
  'course-1': '#6366f1',
  'course-2': '#22c55e',
  'course-3': '#f97316',
  'course-4': '#a855f7',
};

function getColor(courseId: string): string {
  return COURSE_COLORS[courseId] ?? '#94a3b8';
}

function computePositions(nodes: { id: string }[]) {
  return Object.fromEntries(
    nodes.map((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      return [n.id, { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }];
    })
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface PersonalGraphViewProps {
  onViewCourse?: (courseId: string) => void;
}

export function PersonalGraphView({ onViewCourse }: PersonalGraphViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const positions = useMemo(() => computePositions(mockPersonalNodes), []);

  const selected: PersonalGraphNode | undefined = mockPersonalNodes.find(
    (n) => n.id === selectedId
  );

  const connectedEdges = useMemo(
    () =>
      mockPersonalEdges.filter(
        (e) => e.source === selectedId || e.target === selectedId
      ),
    [selectedId]
  );
  const connectedIds = useMemo(
    () => new Set(connectedEdges.flatMap((e) => [e.source, e.target])),
    [connectedEdges]
  );

  // Unique course list for legend
  const courses = useMemo(
    () =>
      [...new Map(mockPersonalNodes.map((n) => [n.courseId, n.courseName])).entries()],
    []
  );

  return (
    <div className="grid grid-cols-12 gap-4 mt-2">
      {/* SVG Graph */}
      <Card className="col-span-12 lg:col-span-8">
        <CardContent className="p-2">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full select-none"
            style={{ maxHeight: '420px' }}
          >
            {mockPersonalEdges.map((e) => {
              const from = positions[e.source];
              const to = positions[e.target];
              if (!from || !to) return null;
              const active =
                selectedId === null ||
                (connectedIds.has(e.source) && connectedIds.has(e.target));
              return (
                <line
                  key={e.id}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="#94a3b8"
                  strokeWidth={active ? 1.5 : 0.5}
                  opacity={active ? 0.6 : 0.15}
                />
              );
            })}
            {mockPersonalNodes.map((n) => {
              const pos = positions[n.id];
              if (!pos) return null;
              const isSelected = n.id === selectedId;
              const isConnected = connectedIds.has(n.id);
              const dimmed = selectedId !== null && !isConnected && !isSelected;
              const r = isSelected ? 16 : 12;
              return (
                <g
                  key={n.id}
                  data-personal-node={n.id}
                  onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none"
                      stroke={getColor(n.courseId)} strokeWidth={2} opacity={0.4} />
                  )}
                  <circle
                    cx={pos.x} cy={pos.y} r={r}
                    fill={getColor(n.courseId)}
                    opacity={dimmed ? 0.15 : isSelected ? 1 : isConnected ? 0.85 : 0.65}
                    stroke="white" strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={pos.x} y={pos.y + r + 12}
                    textAnchor="middle" fontSize={isSelected ? 9 : 8}
                    fontWeight={isSelected ? 700 : 400}
                    fill={dimmed ? '#cbd5e1' : '#1e293b'}
                  >
                    {n.label.length > 18 ? n.label.slice(0, 16) + '…' : n.label}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Course legend */}
          <div className="flex flex-wrap gap-3 px-2 pb-2 text-xs text-muted-foreground">
            {courses.map(([courseId, courseName]) => (
              <span key={courseId} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getColor(courseId) }} />
                {courseName}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail panel */}
      <div className="col-span-12 lg:col-span-4 space-y-3">
        {selected ? (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {selected.courseName}
                {selected.contentTimestamp !== undefined && (
                  <span className="ml-2 font-mono bg-muted px-1 rounded">
                    {formatTimestamp(selected.contentTimestamp)}
                  </span>
                )}
              </p>
              <p className="text-sm font-semibold">{selected.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {selected.excerpt}
              </p>
              {connectedEdges.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Connected via:
                  </p>
                  {connectedEdges.map((e) => (
                    <span key={e.id}
                      className="inline-block mr-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded"
                    >
                      {e.sharedConcept}
                    </span>
                  ))}
                </div>
              )}
              {onViewCourse && (
                <button
                  onClick={() => onViewCourse(selected.courseId)}
                  className="w-full flex items-center text-xs text-muted-foreground hover:text-foreground mt-1"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  View course
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                Click a node to see your annotation details and conceptual connections.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Personal Wiki Stats
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-muted/40 rounded">
                <p className="text-lg font-bold">{mockPersonalNodes.length}</p>
                <p className="text-muted-foreground">Annotations</p>
              </div>
              <div className="text-center p-2 bg-muted/40 rounded">
                <p className="text-lg font-bold">{courses.length}</p>
                <p className="text-muted-foreground">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import type { Hotspot } from '@/types/quiz';

interface Props {
  item: Hotspot;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function HotspotQuestion({ item, value, onChange, disabled }: Props) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id]
    );
  };

  return (
    <div className="space-y-3">
      <p className="font-medium text-sm">{item.question}</p>
      <p className="text-xs text-muted-foreground">
        Click on the correct area(s) in the image
      </p>
      <div className="relative inline-block w-full max-w-2xl">
        <img
          src={item.imageUrl}
          alt="Hotspot image"
          className="w-full rounded-lg border"
          draggable={false}
        />
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label="Hotspot overlay"
        >
          {item.hotspots.map((hs) => {
            const selected = value.includes(hs.id);
            return (
              <g key={hs.id}>
                <circle
                  cx={hs.x}
                  cy={hs.y}
                  r={hs.radius}
                  className={`cursor-pointer transition-colors ${disabled ? 'cursor-default' : ''}`}
                  fill={
                    selected ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.3)'
                  }
                  stroke={selected ? '#3b82f6' : '#6b7280'}
                  strokeWidth="0.8"
                  onClick={() => toggle(hs.id)}
                  role="button"
                  aria-pressed={selected}
                  aria-label={hs.label}
                />
                {selected && (
                  <text
                    x={hs.x}
                    y={hs.y + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fill="#1d4ed8"
                    style={{ pointerEvents: 'none' }}
                  >
                    {hs.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

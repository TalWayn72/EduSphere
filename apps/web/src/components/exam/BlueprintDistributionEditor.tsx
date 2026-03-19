/**
 * BlueprintDistributionEditor — reusable weight editor for domain/bloom distributions.
 * Shows sliders with min/max % and a total indicator.
 */
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface DistributionItem {
  label: string;
  weight: number;
  minPercent: number;
  maxPercent: number;
}

interface BlueprintDistributionEditorProps {
  title: string;
  items: DistributionItem[];
  onChange: (items: DistributionItem[]) => void;
}

export function BlueprintDistributionEditor({
  title, items, onChange,
}: BlueprintDistributionEditorProps) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const isValid = totalWeight >= 98 && totalWeight <= 102;

  const updateItem = (index: number, patch: Partial<DistributionItem>) => {
    const next = items.map((item, i) => i === index ? { ...item, ...patch } : item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{title}</Label>
        <span className={`text-sm font-mono ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          Total: {totalWeight}%
        </span>
      </div>

      {/* Visual distribution bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="h-full transition-all"
            style={{
              width: `${totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0}%`,
              backgroundColor: `hsl(${(i * 60) % 360}, 70%, 60%)`,
            }}
            title={`${item.label}: ${item.weight}%`}
          />
        ))}
      </div>

      {/* Per-item controls */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <DistributionRow
            key={item.label}
            item={item}
            index={index}
            onUpdate={(patch) => updateItem(index, patch)}
          />
        ))}
      </div>

      {!isValid && (
        <p className="text-sm text-destructive" role="alert">
          Weights must sum to approximately 100% (currently {totalWeight}%).
        </p>
      )}
    </div>
  );
}

// ── Row sub-component ────────────────────────────────────────────────────────

interface DistributionRowProps {
  item: DistributionItem;
  index: number;
  onUpdate: (patch: Partial<DistributionItem>) => void;
}

function DistributionRow({ item, index, onUpdate }: DistributionRowProps) {
  return (
    <div className="grid grid-cols-[140px_1fr_70px_70px] items-center gap-3">
      <span className="text-sm font-medium truncate">{item.label}</span>
      <Slider
        value={[item.weight]}
        onValueChange={([v]) => onUpdate({ weight: v ?? 0 })}
        min={0}
        max={100}
        step={1}
        aria-label={`${item.label} weight`}
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={item.minPercent}
        onChange={(e) => onUpdate({ minPercent: Number(e.target.value) })}
        className="h-8 text-xs"
        aria-label={`${item.label} min %`}
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={item.maxPercent}
        onChange={(e) => onUpdate({ maxPercent: Number(e.target.value) })}
        className="h-8 text-xs"
        aria-label={`${item.label} max %`}
      />
    </div>
  );
}

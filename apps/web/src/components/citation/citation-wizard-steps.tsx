/**
 * citation-wizard-steps — sub-components for CitationFormatWizard steps.
 */
import { Textarea } from '@/components/ui/textarea';
import {
  type PresetOption,
  PRESET_OPTIONS,
  type CitationPreset,
} from './citation-wizard-constants';

// Re-export for backwards compatibility
export type { CitationPreset, PresetOption };
export { PRESET_OPTIONS };

// ── StepDots ──────────────────────────────────────────────────────────────────

export function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-4">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i + 1 === current
              ? 'bg-blue-600'
              : i + 1 < current
                ? 'bg-blue-300'
                : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1: Preset selector ───────────────────────────────────────────────────

interface Step1Props {
  selectedPreset: CitationPreset;
  onChange: (preset: CitationPreset) => void;
}

export function Step1PresetSelector({ selectedPreset, onChange }: Step1Props) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Citation preset">
      {PRESET_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            selectedPreset === option.value
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-border hover:bg-muted/50'
          }`}
        >
          <input
            type="radio"
            name="citation-preset"
            value={option.value}
            checked={selectedPreset === option.value}
            onChange={() => onChange(option.value)}
            className="mt-0.5 accent-blue-600"
          />
          <span>
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              {option.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

// ── Step 2: Custom description ────────────────────────────────────────────────

interface Step2Props {
  value: string;
  onChange: (value: string) => void;
}

export function Step2CustomDescription({ value, onChange }: Step2Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Describe your citation format. The AI will use this when detecting and
        verifying citations in lesson transcripts.
      </p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Book Title, Chapter X, Verse Y — as used in classical commentary..."
        rows={5}
        autoFocus
        data-testid="custom-citation-description"
      />
    </div>
  );
}

// ── Step 3: Confirmation ──────────────────────────────────────────────────────

interface Step3Props {
  selectedOption: PresetOption | undefined;
  isCustom: boolean;
  customDescription: string;
  error: string;
}

export function Step3Confirmation({
  selectedOption,
  isCustom,
  customDescription,
  error,
}: Step3Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ready to save the following citation format:
      </p>
      <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
        <p className="text-sm font-medium">{selectedOption?.label}</p>
        <p className="text-xs text-muted-foreground">
          {isCustom
            ? customDescription || '(no description provided)'
            : selectedOption?.description}
        </p>
      </div>
      {error && (
        <p
          className="text-sm text-red-500 bg-red-50 rounded px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

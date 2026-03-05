import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode, FontSize, ThemePrimitives } from '@/lib/theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const THEME_MODES: { value: ThemeMode; label: string; Icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

// ── ThemeSettingsPage ─────────────────────────────────────────────────────────

export function ThemeSettingsPage() {
  const {
    userPreferences,
    setThemeMode,
    setFontSize,
    setReadingMode,
    setMotionPreference,
    previewThemeChanges,
  } = useTheme();

  const [primaryColor, setPrimaryColor] = React.useState('#6366f1');
  const [previewCleanup, setPreviewCleanup] = React.useState<(() => void) | null>(null);

  // Cleanup preview on unmount
  React.useEffect(() => {
    return () => {
      previewCleanup?.();
    };
  }, [previewCleanup]);

  function handlePreview() {
    if (previewCleanup) previewCleanup();
    const primitives: ThemePrimitives = { primary: hexToHsl(primaryColor) };
    const cleanup = previewThemeChanges(primitives);
    setPreviewCleanup(() => cleanup);
  }

  function handleSaveBrandColor() {
    // In production this would call a GraphQL mutation.
    // For now: persist to theme context via previewThemeChanges (no-op save).
    const primitives: ThemePrimitives = { primary: hexToHsl(primaryColor) };
    previewThemeChanges(primitives);
  }

  function handleReset() {
    setThemeMode('system');
    setFontSize('md');
    setReadingMode(false);
    setMotionPreference('full');
    setPrimaryColor('#6366f1');
    if (previewCleanup) {
      previewCleanup();
      setPreviewCleanup(null);
    }
  }

  const isReduceMotion = userPreferences.motionPreference !== 'full';
  const isHighContrast = userPreferences.contrastMode === 'high';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-10">
      <h1 className="text-2xl font-bold text-foreground">Theme &amp; Appearance Settings</h1>

      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="appearance-heading" className="space-y-4">
        <h2 id="appearance-heading" className="text-lg font-semibold text-foreground">
          Appearance
        </h2>

        <div>
          <p className="text-sm text-muted-foreground mb-3">Theme mode</p>
          <div
            role="radiogroup"
            aria-label="Theme mode"
            className="flex gap-3"
            data-testid="theme-mode-selector"
          >
            {THEME_MODES.map(({ value, label, Icon }) => (
              <label
                key={value}
                className={[
                  'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors',
                  userPreferences.mode === value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="theme-mode"
                  value={value}
                  checked={userPreferences.mode === value}
                  onChange={() => setThemeMode(value)}
                  className="sr-only"
                  aria-label={label}
                />
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── Typography ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="typography-heading" className="space-y-4">
        <h2 id="typography-heading" className="text-lg font-semibold text-foreground">
          Typography
        </h2>

        <div>
          <p className="text-sm text-muted-foreground mb-3">Font size</p>
          <div
            role="radiogroup"
            aria-label="Font size"
            className="flex gap-3 flex-wrap"
            data-testid="font-size-selector"
          >
            {FONT_SIZES.map(({ value, label }) => (
              <label
                key={value}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors',
                  userPreferences.fontSize === value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="font-size"
                  value={value}
                  checked={userPreferences.fontSize === value}
                  onChange={() => setFontSize(value)}
                  className="sr-only"
                  aria-label={label}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-muted-foreground" style={{ fontSize: 'inherit' }}>
            Preview text — The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </section>

      {/* ── Motion & Accessibility ──────────────────────────────────────────── */}
      <section aria-labelledby="motion-heading" className="space-y-4">
        <h2 id="motion-heading" className="text-lg font-semibold text-foreground">
          Motion &amp; Accessibility
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reduce motion</p>
              <p className="text-xs text-muted-foreground">
                Minimises animations and transitions
              </p>
            </div>
            <Switch
              checked={isReduceMotion}
              onCheckedChange={(checked) =>
                setMotionPreference(checked ? 'reduced' : 'full')
              }
              aria-label="Reduce motion"
              data-testid="motion-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">High contrast</p>
              <p className="text-xs text-muted-foreground">
                Increases text and UI element contrast
              </p>
            </div>
            <Switch
              checked={isHighContrast}
              onCheckedChange={() => {
                /* contrast is read-only derived from contrastMode; no setter in context — placeholder */
              }}
              aria-label="High contrast"
              data-testid="contrast-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reading mode</p>
              <p className="text-xs text-muted-foreground">
                Wider margins and improved line-height for long-form content
              </p>
            </div>
            <Switch
              checked={userPreferences.readingMode}
              onCheckedChange={(checked) => setReadingMode(checked)}
              aria-label="Reading mode"
              data-testid="reading-mode-toggle"
            />
          </div>
        </div>
      </section>

      {/* ── Brand Colors (ORG_ADMIN) ────────────────────────────────────────── */}
      <section aria-labelledby="brand-heading" className="space-y-4">
        <h2 id="brand-heading" className="text-lg font-semibold text-foreground">
          Brand Colors
        </h2>
        <p className="text-xs text-muted-foreground">
          Available to Organisation Administrators only.
        </p>

        <div className="flex items-end gap-4">
          <div>
            <label
              htmlFor="brand-color-input"
              className="text-sm font-medium text-foreground block mb-1.5"
            >
              Primary colour
            </label>
            <input
              id="brand-color-input"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-20 rounded-md border border-border cursor-pointer"
              aria-label="Primary brand colour"
              data-testid="brand-color-picker"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            Preview
          </Button>
          <Button size="sm" onClick={handleSaveBrandColor}>
            Save
          </Button>
        </div>
      </section>

      {/* ── Reset ──────────────────────────────────────────────────────────── */}
      <section aria-labelledby="reset-heading" className="border-t pt-6">
        <h2 id="reset-heading" className="text-lg font-semibold text-foreground mb-3">
          Reset
        </h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleReset}
          data-testid="reset-theme-btn"
        >
          Reset to defaults
        </Button>
      </section>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a CSS hex colour string (e.g. "#6366f1") to HSL component string
 * for use as a CSS variable value (e.g. "239 84% 67%").
 * Uses a best-effort approximation — production would use a proper colour lib.
 */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default ThemeSettingsPage;

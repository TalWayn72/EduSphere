import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Layout } from '@/components/Layout';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import type { ThemePrimitives } from '@/lib/theme';
import { THEME_MODES, FONT_SIZES, hexToHsl } from './ThemeSettingsPage.helpers';

const ICON_MAP: Record<string, React.ElementType> = { Sun, Moon, Monitor };

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
  const [previewCleanup, setPreviewCleanup] = React.useState<
    (() => void) | null
  >(null);

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
    <Layout>
      <PageShell size="sm" spacing="relaxed" className="py-8">
        <Breadcrumbs
          items={[{ label: 'Settings', href: '/settings' }, { label: 'Theme' }]}
        />
        <h1 className="text-2xl font-bold text-foreground">
          Theme &amp; Appearance Settings
        </h1>

        {/* Appearance */}
        <section aria-labelledby="appearance-heading" className="space-y-4">
          <h2
            id="appearance-heading"
            className="text-lg font-semibold text-foreground"
          >
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
              {THEME_MODES.map(({ value, label, iconName }) => {
                const Icon = ICON_MAP[iconName] ?? Sun;
                return (
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
                );
              })}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section aria-labelledby="typography-heading" className="space-y-4">
          <h2
            id="typography-heading"
            className="text-lg font-semibold text-foreground"
          >
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
            <p
              className="mt-3 text-muted-foreground"
              style={{ fontSize: 'inherit' }}
            >
              Preview text — The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </section>

        {/* Motion & Accessibility */}
        <section aria-labelledby="motion-heading" className="space-y-4">
          <h2
            id="motion-heading"
            className="text-lg font-semibold text-foreground"
          >
            Motion &amp; Accessibility
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Reduce motion
                </p>
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
                <p className="text-sm font-medium text-foreground">
                  High contrast
                </p>
                <p className="text-xs text-muted-foreground">
                  Increases text and UI element contrast
                </p>
              </div>
              <Switch
                checked={isHighContrast}
                onCheckedChange={() => {}}
                aria-label="High contrast"
                data-testid="contrast-toggle"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Reading mode
                </p>
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

        {/* Brand Colors */}
        <section aria-labelledby="brand-heading" className="space-y-4">
          <h2
            id="brand-heading"
            className="text-lg font-semibold text-foreground"
          >
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

        {/* Reset */}
        <section aria-labelledby="reset-heading" className="border-t pt-6">
          <h2
            id="reset-heading"
            className="text-lg font-semibold text-foreground mb-3"
          >
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
      </PageShell>
    </Layout>
  );
}

export default ThemeSettingsPage;

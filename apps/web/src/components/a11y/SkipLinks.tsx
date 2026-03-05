/**
 * WCAG 2.4.1 — Bypass Blocks
 * Skip links appear on :focus, hidden visually until focused.
 */
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-2 focus-within:left-2 focus-within:z-[9999] flex gap-2">
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-elevated focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="skip-to-main"
      >
        Skip to main content
      </a>
      <a
        href="#main-nav"
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-elevated focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="skip-to-nav"
      >
        Skip to navigation
      </a>
    </div>
  );
}

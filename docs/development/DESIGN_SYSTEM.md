# EduSphere Design System

**Version:** 1.0 | **Introduced:** Session 25 (Phase 25)
**Primary Color:** Indigo `#6366F1` | **Design Language:** Tailwind CSS + shadcn/ui

---

## Overview

The EduSphere Design System establishes a unified visual language across web and mobile. It is built on three tiers of theming:

1. **Globals** — CSS custom properties in `globals.css` (base defaults)
2. **Tenant primitives** — Inline CSS vars overriding globals per tenant (from DB `tenant_themes`)
3. **User preferences** — Class toggles on `<html>` (dark mode, font size, reduced motion)

FOUC (Flash of Unstyled Content) is prevented by an inline script in `apps/web/index.html` that reads `localStorage` before React hydrates.

---

## Web Tokens (`apps/web/src/styles/globals.css`)

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#6366F1` (Indigo 500) | Primary actions, links, active states |
| `--color-primary-hover` | `#4F46E5` (Indigo 600) | Hover state |
| `--color-primary-light` | `#EEF2FF` (Indigo 50) | Backgrounds, tints |
| `--color-secondary` | `#8B5CF6` (Violet 500) | Secondary actions |
| `--color-success` | `#10B981` (Emerald 500) | Success states |
| `--color-warning` | `#F59E0B` (Amber 500) | Warning states |
| `--color-error` | `#EF4444` (Red 500) | Error states |
| `--color-mastery-novice` | `#94A3B8` | MasteryBadge level 1 |
| `--color-mastery-beginner` | `#60A5FA` | MasteryBadge level 2 |
| `--color-mastery-intermediate` | `#34D399` | MasteryBadge level 3 |
| `--color-mastery-advanced` | `#FBBF24` | MasteryBadge level 4 |
| `--color-mastery-expert` | `#A78BFA` | MasteryBadge level 5 |

### Spacing

| Token | Value |
|-------|-------|
| `--spacing-1` | `4px` |
| `--spacing-2` | `8px` |
| `--spacing-3` | `12px` |
| `--spacing-4` | `16px` |
| `--spacing-6` | `24px` |
| `--spacing-8` | `32px` |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Inputs, small elements |
| `--radius-md` | `8px` | Cards, buttons |
| `--radius-lg` | `12px` | Panels, modals |
| `--radius-full` | `9999px` | Badges, pills |

---

## Mobile Tokens (`apps/mobile/src/lib/theme.ts`)

```typescript
export const COLORS = {
  primary: '#6366F1',      // Indigo 500 — replaces iOS #007AFF and Material #2563EB
  primaryHover: '#4F46E5',
  primaryLight: '#EEF2FF',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  // Mastery levels
  masteryNovice: '#94A3B8',
  masteryBeginner: '#60A5FA',
  masteryIntermediate: '#34D399',
  masteryAdvanced: '#FBBF24',
  masteryExpert: '#A78BFA',
  // Neutrals
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#CBD5E1',
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

export const RADIUS = {
  sm: 4, md: 8, lg: 12, full: 9999,
};

export const FONT = {
  sizeSm: 12, sizeMd: 14, sizeLg: 16, sizeXl: 18, sizeXxl: 24,
  weightRegular: '400', weightMedium: '500', weightSemibold: '600', weightBold: '700',
};

export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
};
```

---

## ThemeProvider (`apps/web/src/components/ThemeProvider.tsx`)

The ThemeProvider is the **outermost wrapper** in `App.tsx` — placed OUTSIDE `QueryClient` and `Urql` providers.

```typescript
// Placement order in App.tsx:
<ThemeProvider>           // OUTERMOST
  <QueryClientProvider>
    <UrqlProvider>
      <Router>
        <App />
      </Router>
    </UrqlProvider>
  </QueryClientProvider>
</ThemeProvider>
```

### Tier 1: globals.css

CSS custom properties loaded globally. The base defaults for all tenants.

### Tier 2: Tenant Primitives

When a tenant has custom branding (from `tenant_themes` DB table), their color tokens are injected as inline CSS vars on a wrapper element. This overrides the globals.css defaults for that tenant session.

### Tier 3: User Preferences

User preference toggles (dark mode, font size, reduced motion) are stored in `localStorage` and applied as CSS classes on the `<html>` element:
- `class="dark"` — dark mode
- `class="font-large"` — larger font size
- `data-reduced-motion="true"` — disables animations

### FOUC Prevention

`apps/web/index.html` contains an inline `<script>` before React loads that reads `localStorage['theme']` and applies the user's preference class to `<html>` synchronously. This prevents the flash of unstyled content on page load.

---

## MasteryBadge Component

**Web:** `packages/ui/src/components/MasteryBadge.tsx`
**Mobile:** `apps/mobile/src/components/MasteryBadge.tsx`
**Test ID pattern:** `testID="mastery-badge-{level}"` (1-5)

| Level | Label | Color |
|-------|-------|-------|
| 1 | Novice | `#94A3B8` (slate) |
| 2 | Beginner | `#60A5FA` (blue) |
| 3 | Intermediate | `#34D399` (emerald) |
| 4 | Advanced | `#FBBF24` (amber) |
| 5 | Expert | `#A78BFA` (violet) |

---

## AppSidebar (`apps/web/src/components/AppSidebar.tsx`)

| State | Width | Behavior |
|-------|-------|----------|
| Expanded | 240px | Shows icon + label |
| Collapsed | 64px | Shows icon only (tooltips on hover) |

**6 Navigation Groups:**
1. Dashboard
2. Learning (Courses, Lessons, SkillTree)
3. Knowledge (Knowledge Graph, Search)
4. Sessions (Live Sessions, Calendar)
5. Community (Collaboration, Chat)
6. Admin (Admin Dashboard, Activity Feed) — role-gated

---

## Accessibility

All components meet **WCAG 2.2 AAA** standards:

| Hook/Component | Purpose | Pattern |
|----------------|---------|---------|
| `SkipLinks` | Skip to main content | `<a href="#main-content">` |
| `useFocusTrap` | Trap focus in modals/drawers | Tab/Shift+Tab cycle within container |
| `useAnnounce` | Screen reader announcements | Dual live-region (polite + assertive) |
| `useReducedMotion` | Respect prefers-reduced-motion | CSS animation disable on `data-reduced-motion` |

---

## Adding to INDEX.md

This file should be cross-linked from `docs/INDEX.md` under `docs/development/`.

---

*Last Updated: 2026-03-06 | Session 27*

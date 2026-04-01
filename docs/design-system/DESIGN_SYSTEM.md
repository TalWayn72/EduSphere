# EduSphere Design System Specification

> **Status:** Authoritative | **Version:** 1.0.0 | **Last Updated:** 2026-03-16
>
> This document is the single source of truth for visual structure, layout patterns,
> color tokens, accessibility requirements, and page anatomy across the entire
> EduSphere application. Every page — public, authenticated, or admin — MUST
> conform to the rules defined here.

---

## 1. Design Philosophy & References

EduSphere's design language is assembled from four best-in-class reference systems,
each contributing a distinct layer:

| Layer                      | Reference           | What We Adopt                                                                                                                |
| -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **App shell & navigation** | Linear              | Collapsible sidebar, compact topbar, content area, `Cmd+K` / `Ctrl+K` command palette                                        |
| **Domain patterns**        | Canvas LMS (InstUI) | Course card grids, module accordions, gradebook tables, discussion threading, assignment submission flows                    |
| **Token & theming**        | Stripe              | Semantic color tokens auto-derived from WCAG contrast algorithms, multi-tenant brand color generation from a single seed hue |
| **Documentation**          | IBM Carbon          | Component anatomy diagrams, usage/do-don't matrices, decision tables per pattern                                             |

### Guiding Principles

1. **Consistency over novelty** — Every page should feel like it belongs to the same product.
2. **Accessibility is not optional** — WCAG 2.2 AA compliance is a hard gate, not a nice-to-have.
3. **Semantic tokens first** — Raw color values are banned outside of theme definition files.
4. **Progressive disclosure** — Show the minimum UI needed; reveal complexity on demand.
5. **Responsive by default** — Every component works from 320px to ultrawide without horizontal scroll.

---

## 2. Page Anatomy Standard

Every page in the application MUST include the elements listed below. The table
shows which layout wrapper provides each element.

| Element                            | Public Pages    | Authenticated Pages | Admin Pages                   |
| ---------------------------------- | --------------- | ------------------- | ----------------------------- |
| Skip link (`Skip to main content`) | `PublicLayout`  | `Layout`            | `Layout`                      |
| Logo (links to home `/`)           | `PublicNav`     | `AppSidebar`        | `AppSidebar`                  |
| Primary navigation                 | `PublicNav`     | `AppSidebar`        | `AppSidebar` + `AdminSidebar` |
| `<main id="main-content">`         | Yes             | Yes                 | Yes                           |
| `<h1>` (via `PageHeader`)          | Yes             | Yes                 | Yes                           |
| Footer                             | `LandingFooter` | `AuthFooter`        | `AuthFooter`                  |
| Breadcrumbs (when depth > 1)       | Optional        | Required            | Required                      |
| Dark mode (semantic tokens)        | Yes             | Yes                 | Yes                           |
| Mobile responsive                  | Yes             | Yes                 | Yes                           |
| Command palette (`Cmd+K`)          | No              | Yes                 | Yes                           |

### Layout Wrapper Responsibility

- **`PublicLayout`** — Wraps all unauthenticated pages (landing, pricing, about, login, signup). Provides `PublicNav`, `<main>`, and `LandingFooter`.
- **`Layout`** — Wraps all authenticated pages. Provides `AppSidebar`, `Topbar`, `<main>`, and `AuthFooter`.
- **`AdminLayout`** — Extends `Layout` with an additional `AdminSidebar` for admin-only navigation sections.

A page component NEVER renders its own `<nav>`, `<header>`, or `<footer>` — those come exclusively from the layout wrapper.

---

## 3. Six Page Templates

Every page in the application MUST follow one of these six templates. The template
determines the `PageShell` size, expected child components, and structural pattern.

### 3.1 ListPage

> Browsable collections of entities.
> Examples: `CourseListPage`, `NotificationsPage`, `UserManagementPage`

| Property       | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| PageShell size | `md` to `xl` (depends on data density)                         |
| PageHeader     | Title + optional description + action buttons (Create, Import) |
| Content        | Filter bar + grid or virtualized list of items                 |
| Empty state    | Illustration + message + CTA button                            |
| Pagination     | Cursor-based (Relay spec) with Load More or infinite scroll    |

```
PageShell (md–xl)
├── PageHeader (title, description, actions)
├── FilterBar (search, sort, status filters)
├── DataGrid | CardGrid | VirtualList
│   ├── Item[]
│   └── EmptyState (when items.length === 0)
└── Pagination | LoadMore
```

### 3.2 DetailPage

> Single-entity view with rich content sections.
> Examples: `CourseDetailPage`, `ProfilePage`, `DiscussionThreadPage`

| Property       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| PageShell size | `md`                                                    |
| PageHeader     | Breadcrumbs + back button + title + entity status badge |
| Content        | Entity hero section + tabbed or sectioned content       |
| Actions        | Edit / Delete / Share in header or floating action bar  |

```
PageShell (md)
├── Breadcrumbs
├── PageHeader (back button, title, status, actions)
├── EntityHero (image/avatar, key metadata, stats)
└── Tabs | SectionedContent
    ├── Tab/Section 1
    ├── Tab/Section 2
    └── Tab/Section N
```

### 3.3 DashboardPage

> Overview pages with statistics, charts, and widget grids.
> Examples: `DashboardPage`, `AdminDashboardPage`, `AnalyticsPage`

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| PageShell size | `2xl`                                        |
| PageHeader     | Title + date range selector + refresh button |
| Content        | Stat cards grid + charts + activity feed     |
| Layout         | CSS Grid with responsive column spans        |

```
PageShell (2xl)
├── PageHeader (title, date range, refresh)
├── StatCardGrid (2–4 columns)
│   ├── StatCard (metric, trend, sparkline)
│   └── StatCard[]
├── ChartRow (1–2 charts per row)
│   ├── Chart (bar, line, area, donut)
│   └── Chart
└── ActivityFeed | RecentItems
```

### 3.4 FormPage

> Create and edit workflows with validated inputs.
> Examples: `CourseCreatePage`, `SettingsPage`, `ProfileEditPage`

| Property       | Value                                                  |
| -------------- | ------------------------------------------------------ |
| PageShell size | `sm` to `md`                                           |
| PageHeader     | Back button + title ("Create Course" / "Edit Profile") |
| Content        | Card-wrapped form sections with field groups           |
| Actions        | Sticky bottom action bar (Cancel + Submit)             |

```
PageShell (sm–md)
├── PageHeader (back button, title)
├── Card
│   ├── SectionHeader ("Basic Information")
│   └── FormFields (input, select, textarea, file upload)
├── Card
│   ├── SectionHeader ("Advanced Settings")
│   └── FormFields
└── StickyActionBar (Cancel, Save Draft, Submit)
```

### 3.5 ContentPage

> Long-form rich text, marketing, and informational pages.
> Examples: `CompliancePage`, `TermsOfServicePage`, `BlogPostPage`

| Property       | Value                                           |
| -------------- | ----------------------------------------------- |
| PageShell size | `lg`                                            |
| PageHeader     | Title + optional subtitle + published date      |
| Content        | Prose content with consistent typographic scale |
| Navigation     | Optional table of contents sidebar (sticky)     |

```
PageShell (lg)
├── PageHeader (title, subtitle, date)
├── TableOfContents (optional, sticky sidebar)
└── Prose
    ├── Section (h2 + paragraphs + lists + callouts)
    ├── Section
    └── Section
```

### 3.6 EditorPage

> Full-width builder interfaces with tool palettes and canvases.
> Examples: `QuizBuilderPage`, `PortalBuilderPage`, `PipelineEditorPage`

| Property       | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| PageShell size | `full`                                                         |
| PageHeader     | Compact (entity name + save status + action buttons)           |
| Content        | Sidebar tool palette + main canvas + optional properties panel |
| Scrolling      | Canvas scrolls independently; palettes are fixed               |

```
PageShell (full)
├── CompactPageHeader (name, save status, Preview, Publish)
└── EditorLayout (flex row, full height)
    ├── ToolPalette (fixed left sidebar, collapsible)
    ├── Canvas (scrollable center area)
    └── PropertiesPanel (fixed right sidebar, collapsible)
```

---

## 4. Component Hierarchy

### Layout Wrappers (outermost layer — one per route)

```
Layout Wrappers
├── PublicLayout
│   ├── PublicNav (logo, nav links, theme toggle, CTA)
│   ├── <main id="main-content">
│   │   └── <Outlet />  (page component renders here)
│   └── LandingFooter (links, legal, social)
│
├── Layout
│   ├── AppSidebar (logo, nav items, user menu, collapse toggle)
│   ├── Topbar (breadcrumbs, search, notifications, Cmd+K trigger)
│   ├── <main id="main-content">
│   │   └── <Outlet />
│   └── AuthFooter (minimal: version, help link)
│
└── AdminLayout (extends Layout)
    ├── AppSidebar (standard nav)
    ├── AdminSidebar (admin-only: Users, Tenants, System, Audit)
    ├── Topbar
    ├── <main id="main-content">
    │   └── <Outlet />
    └── AuthFooter
```

### Page Structure Components (inside the page component)

```
Page Structure Components
├── PageShell
│   Purpose: Consistent container width, horizontal padding, vertical spacing
│   Props: size (sm | md | lg | xl | 2xl | full), spacing (compact | normal | relaxed)
│
├── PageHeader
│   Purpose: Page-level H1, breadcrumbs, description, action buttons
│   Props: title, description?, breadcrumbs?, actions?, backHref?
│   Rules: Exactly ONE per page. Always renders <h1>.
│
├── SectionHeader
│   Purpose: Section-level H2 or H3, description, section actions
│   Props: title, level (h2 | h3), description?, actions?
│   Rules: Use for major content divisions within a page.
│
└── Breadcrumbs
    Purpose: Hierarchical navigation path
    Props: items (array of { label, href })
    Rules: Always starts with Home icon. Uses <nav aria-label="Breadcrumb">.
```

### Composition Example

```tsx
// CourseDetailPage.tsx — DetailPage template
export function CourseDetailPage() {
  return (
    <PageShell size="md">
      <PageHeader
        title={course.name}
        breadcrumbs={[
          { label: 'Courses', href: '/courses' },
          { label: course.name, href: `/courses/${course.id}` },
        ]}
        backHref="/courses"
        actions={<Button>Edit Course</Button>}
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <SectionHeader title="Course Description" level="h2" />
          {/* ... */}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
```

---

## 5. Color Token Rules

### Semantic Token System

All colors in the application are expressed as CSS custom properties defined in
`:root` (light) and `.dark` (dark). Components reference these tokens — never raw
Tailwind palette values.

| Token                  | Light Value | Dark Value | Usage                     |
| ---------------------- | ----------- | ---------- | ------------------------- |
| `--background`         | white       | slate-950  | Page background           |
| `--foreground`         | slate-950   | slate-50   | Primary text              |
| `--muted`              | slate-100   | slate-800  | Muted backgrounds         |
| `--muted-foreground`   | slate-500   | slate-400  | Secondary text            |
| `--card`               | white       | slate-900  | Card backgrounds          |
| `--card-foreground`    | slate-950   | slate-50   | Card text                 |
| `--border`             | slate-200   | slate-800  | Borders                   |
| `--input`              | slate-200   | slate-800  | Input borders             |
| `--primary`            | indigo-600  | indigo-400 | Primary actions           |
| `--primary-foreground` | white       | slate-950  | Text on primary           |
| `--destructive`        | red-600     | red-400    | Destructive actions       |
| `--accent`             | slate-100   | slate-800  | Hover / focus backgrounds |
| `--ring`               | indigo-600  | indigo-400 | Focus ring                |

### Rules

1. **NEVER** use raw Tailwind colors (e.g., `bg-slate-100`) without a corresponding `dark:` class.
2. **PREFER** semantic classes: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`.
3. **Brand accent** is `indigo-600` in light mode and `indigo-400` in dark mode, exposed as `--primary`.
4. **Multi-tenant theming:** Tenant brand color generates a full token set via WCAG contrast algorithm. The seed hue replaces `--primary` and derives `--primary-foreground` automatically.
5. **Enforcement:** ESLint rule `no-orphan-colors` flags any Tailwind color class that lacks a `dark:` counterpart.

### Prohibited Patterns

```tsx
// WRONG — raw color without dark counterpart
<div className="bg-gray-100 text-gray-900">

// WRONG — hardcoded hex
<div style={{ color: '#1e293b' }}>

// CORRECT — semantic tokens
<div className="bg-background text-foreground">

// CORRECT — paired light/dark when semantic token unavailable
<div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
```

---

## 6. Spacing Scale

### PageShell Sizes

| Size   | Tailwind Class | Max Width | Use For                      |
| ------ | -------------- | --------- | ---------------------------- |
| `sm`   | `max-w-2xl`    | 672px     | Forms, narrow content, login |
| `md`   | `max-w-4xl`    | 896px     | Standard pages, detail views |
| `lg`   | `max-w-5xl`    | 1024px    | Content pages, marketing     |
| `xl`   | `max-w-6xl`    | 1152px    | Dense list pages             |
| `2xl`  | `max-w-7xl`    | 1280px    | Dashboards, wide layouts     |
| `full` | (none)         | 100%      | Editors, builders            |

All non-`full` sizes include: `mx-auto px-4 sm:px-6 lg:px-8`.

### Vertical Spacing

| Density   | Tailwind Class | Between Sections | Use For                         |
| --------- | -------------- | ---------------- | ------------------------------- |
| `compact` | `space-y-4`    | 16px             | Dense data pages, admin tables  |
| `normal`  | `space-y-6`    | 24px             | Standard pages (default)        |
| `relaxed` | `space-y-8`    | 32px             | Content pages, marketing, forms |

### Standard Spacing Values

| Use                   | Value     | Tailwind                   |
| --------------------- | --------- | -------------------------- |
| Inline element gap    | 8px       | `gap-2`                    |
| Card internal padding | 16px–24px | `p-4` to `p-6`             |
| Section gap           | 24px–32px | `space-y-6` to `space-y-8` |
| Page top padding      | 24px–32px | `pt-6` to `pt-8`           |
| Page bottom padding   | 48px      | `pb-12`                    |

---

## 7. Heading Hierarchy

Correct heading hierarchy is both an accessibility requirement (WCAG 1.3.1) and a
design system rule.

| Level  | Component                  | Typical Styling                     | Usage                                         |
| ------ | -------------------------- | ----------------------------------- | --------------------------------------------- |
| `<h1>` | `PageHeader`               | `text-2xl font-bold tracking-tight` | Page title. Exactly ONE per page.             |
| `<h2>` | `SectionHeader`            | `text-lg font-semibold`             | Major content sections within the page.       |
| `<h3>` | `SectionHeader level="h3"` | `text-base font-semibold`           | Sub-sections within an `<h2>` block.          |
| `<h4>` | Manual                     | `text-sm font-semibold`             | Rare; use inside complex cards or accordions. |

### Rules

1. Every page has exactly **one** `<h1>`, rendered by `PageHeader`.
2. Page sections use `<h2>` via `SectionHeader`.
3. Sub-sections within an `<h2>` block use `<h3>` via `SectionHeader level="h3"`.
4. **Never skip heading levels.** An `<h3>` must be preceded by an `<h2>` in the DOM tree.
5. Heading text must be descriptive and unique within the page.

---

## 8. Breadcrumb Rules

### When Breadcrumbs Are Required

| Route Pattern               | Required | Example                                 |
| --------------------------- | -------- | --------------------------------------- |
| `/courses/:id`              | Yes      | Home > Courses > Introduction to AI     |
| `/courses/:id/lessons/:id`  | Yes      | Home > Courses > Intro to AI > Lesson 3 |
| `/admin/*`                  | Yes      | Home > Admin > User Management          |
| `/settings/*`               | Yes      | Home > Settings > Notifications         |
| `/discussions/:id`          | Yes      | Home > Discussions > Thread Title       |
| `/` (landing)               | No       | —                                       |
| `/courses` (top-level list) | No       | —                                       |
| `/dashboard`                | No       | —                                       |

### Format

```
Home (icon) > Category > Subcategory > Current Page
```

- **Home** is always represented by a house icon (no text label).
- The **last item** is the current page — rendered as plain text (not a link).
- All preceding items are links.
- Separator: `>` (chevron-right icon).
- Wrapped in `<nav aria-label="Breadcrumb">` with an `<ol>` list.

### Implementation

```tsx
<Breadcrumbs
  items={[
    { label: 'Courses', href: '/courses' },
    { label: 'Introduction to AI', href: '/courses/abc123' },
    { label: 'Lesson 3: Neural Networks' }, // no href = current page
  ]}
/>
```

---

## 9. Dark Mode Rules

### Architecture

Dark mode is implemented via a `.dark` class on the `<html>` element, toggled by
the theme provider (persisted in `localStorage`).

```css
:root {
  --background: 0 0% 100%; /* white */
  --foreground: 222.2 84% 4.9%; /* slate-950 */
  /* ... all tokens ... */
}

.dark {
  --background: 222.2 84% 4.9%; /* slate-950 */
  --foreground: 210 40% 98%; /* slate-50 */
  /* ... all tokens ... */
}
```

### Rules

1. **All colors** are defined via CSS custom properties in `:root` and `.dark`.
2. Components use Tailwind semantic classes: `bg-background`, `text-foreground`, `border-border`, etc.
3. When a semantic token is not available, both `light` and `dark:` classes MUST be specified.
4. ESLint enforces: any Tailwind color class without a `dark:` counterpart is flagged.
5. **Testing:** Playwright captures screenshots in both light and dark themes. Visual regression tests run on both.
6. **Images and illustrations:** Must work on both light and dark backgrounds. Use SVGs with `currentColor` where possible.
7. **Shadows:** Use `shadow-sm` / `shadow-md` classes that auto-adapt, or define shadow tokens.

### Theme Toggle

- Public pages: toggle button in `PublicNav` header.
- Authenticated pages: toggle in `AppSidebar` footer or user preferences.
- Respects `prefers-color-scheme` on first visit, then user choice overrides.

---

## 10. Accessibility (WCAG 2.2 AA)

### Mandatory Requirements

| Requirement          | WCAG Criterion | Implementation                                                                                                                                    |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip link            | 2.4.1          | Every layout wrapper renders `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` as the first focusable element. |
| Landmarks            | 1.3.1          | Every page has `<nav>`, `<main>`, and `<footer>` landmarks. Sidebar nav uses `<nav aria-label="Main navigation">`.                                |
| Focus visible        | 2.4.7          | 2px ring using `ring-2 ring-ring ring-offset-2`. Focus ring must not be obscured by sticky headers (`z-index` management).                        |
| Target size          | 2.5.8          | All interactive elements have a minimum 24x24px touch target. Compact table rows use padding to meet this.                                        |
| Heading hierarchy    | 1.3.1          | No skipped heading levels. Enforced by automated test.                                                                                            |
| Breadcrumbs          | 2.4.8          | `<nav aria-label="Breadcrumb">` with `<ol>` structure. Current page marked with `aria-current="page"`.                                            |
| Page title           | 2.4.2          | Unique `<title>` per route, set via `PageMeta` component or `document.title` in `useEffect`.                                                      |
| Color contrast       | 1.4.3 / 1.4.6  | Text: 4.5:1 ratio minimum. Large text (18px+ or 14px+ bold): 3:1 ratio minimum.                                                                   |
| Non-text contrast    | 1.4.11         | UI components and graphical objects: 3:1 ratio against adjacent colors.                                                                           |
| Reflow               | 1.4.10         | Content readable at 320px width without horizontal scrolling.                                                                                     |
| Alt text             | 1.1.1          | All `<img>` elements have descriptive `alt` text. Decorative images use `alt=""`.                                                                 |
| Form labels          | 1.3.1 / 3.3.2  | Every form input has a visible `<label>` or `aria-label`.                                                                                         |
| Error identification | 3.3.1          | Form errors are announced to screen readers and visually indicated with color + icon.                                                             |

### Automated Testing

- **axe-core:** Runs in Playwright E2E tests via `@axe-core/playwright` on every page.
- **Heading hierarchy:** Custom Playwright assertion verifies no skipped levels.
- **Contrast:** CI runs contrast audit on all semantic token pairs.
- **Keyboard navigation:** Playwright E2E tests verify all flows are keyboard-completable.

---

## Appendix A: File Locations

| Artifact                | Path                                               |
| ----------------------- | -------------------------------------------------- |
| Theme CSS variables     | `apps/web/src/index.css`                           |
| PageShell component     | `apps/web/src/components/ui/page-shell.tsx`        |
| PageHeader component    | `apps/web/src/components/ui/page-header.tsx`       |
| SectionHeader component | `apps/web/src/components/ui/section-header.tsx`    |
| Breadcrumbs component   | `apps/web/src/components/ui/breadcrumbs.tsx`       |
| PublicLayout            | `apps/web/src/layouts/PublicLayout.tsx`            |
| Layout (auth)           | `apps/web/src/layouts/Layout.tsx`                  |
| AdminLayout             | `apps/web/src/layouts/AdminLayout.tsx`             |
| ESLint no-orphan-colors | `packages/eslint-config/rules/no-orphan-colors.js` |
| Design System docs      | `docs/design-system/`                              |

## Appendix B: Decision Log

| Decision                            | Rationale                                                                                     | Date       |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | ---------- |
| Linear-style app shell over top-nav | Sidebar scales better for 30+ nav items across roles; collapsible preserves screen space      | 2026-03-16 |
| Six templates (not fewer)           | EditorPage and ContentPage have fundamentally different layout needs from ListPage/DetailPage | 2026-03-16 |
| Semantic tokens over raw Tailwind   | Enables multi-tenant theming + dark mode with a single token swap                             | 2026-03-16 |
| PageHeader owns the H1              | Prevents duplicate or missing H1 — single enforcement point                                   | 2026-03-16 |
| Relay cursor pagination             | Matches GraphQL Federation pagination spec (API Contracts)                                    | 2026-03-16 |

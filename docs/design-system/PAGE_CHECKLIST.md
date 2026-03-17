# Page QA Checklist

> **Usage:** Copy this template for each page in the application. Fill in the
> header fields, then verify every checkbox before the page is considered complete.
> A page that fails any mandatory check MUST NOT be merged.
>
> **Companion doc:** `docs/design-system/DESIGN_SYSTEM.md` defines the rules
> referenced by each check below.

---

## Page: [Page Name]
## Route: [/route/path]
## Template: [ListPage | DetailPage | DashboardPage | FormPage | ContentPage | EditorPage]
## Layout: [PublicLayout | Layout | AdminLayout]

---

### Structure

- [ ] Wrapped in the correct layout wrapper (`PublicLayout` / `Layout` / `AdminLayout`)
- [ ] Uses `PageShell` with appropriate size for the template
- [ ] Has `PageHeader` rendering a single `<h1>` with the page title
- [ ] Breadcrumbs present (required if route depth > 1)
- [ ] Content sections use `SectionHeader` for `<h2>` / `<h3>` headings
- [ ] Follows the structural skeleton of its template (see DESIGN_SYSTEM.md Section 3)
- [ ] Empty states handled with illustration + message + CTA (ListPage, DashboardPage)
- [ ] Loading states use skeleton placeholders (not spinners blocking the full page)
- [ ] Error states display user-friendly message (no raw technical strings)

### Heading Hierarchy

- [ ] Exactly one `<h1>` element on the page (rendered by `PageHeader`)
- [ ] No skipped heading levels (`<h1>` followed by `<h2>`, not `<h3>`)
- [ ] All `<h2>` elements rendered by `SectionHeader`
- [ ] All `<h3>` elements rendered by `SectionHeader level="h3"` inside an `<h2>` section
- [ ] Heading text is descriptive and unique within the page

### Accessibility — Landmarks & Navigation

- [ ] Page has `<main id="main-content">` landmark (provided by layout)
- [ ] Page has `<nav>` landmark (provided by layout)
- [ ] Page has `<footer>` landmark (provided by layout)
- [ ] Skip link present and functional (first focusable element, provided by layout)
- [ ] Breadcrumbs use `<nav aria-label="Breadcrumb">` with `<ol>` structure
- [ ] Current breadcrumb item has `aria-current="page"`
- [ ] Page has unique `<title>` set via `PageMeta` or `document.title`

### Accessibility — Interaction

- [ ] All interactive elements reachable via keyboard (Tab / Shift+Tab)
- [ ] Focus order follows visual reading order
- [ ] Focus indicators visible (2px ring, not obscured by sticky elements)
- [ ] All buttons have accessible names (visible text or `aria-label`)
- [ ] All form inputs have visible `<label>` or `aria-label`
- [ ] Form errors announced to screen readers (`aria-describedby` or live region)
- [ ] Modals trap focus and return focus on close
- [ ] Dropdowns / popovers are keyboard-navigable (Arrow keys, Escape to close)

### Accessibility — Content

- [ ] All images have descriptive `alt` text (decorative images use `alt=""`)
- [ ] Color is not the sole means of conveying information
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] Non-text contrast meets 3:1 against adjacent colors (WCAG 1.4.11)
- [ ] Touch targets are at least 24x24px (WCAG 2.5.8)
- [ ] Animations respect `prefers-reduced-motion` media query

### Dark Mode

- [ ] No raw Tailwind color classes without `dark:` counterpart
- [ ] All backgrounds use semantic tokens (`bg-background`, `bg-card`, `bg-muted`)
- [ ] All text uses semantic tokens (`text-foreground`, `text-muted-foreground`)
- [ ] Borders use `border-border`
- [ ] Focus rings use `ring-ring`
- [ ] Page visually verified in both light and dark themes
- [ ] No elements become invisible or unreadable in dark mode
- [ ] Images / illustrations work on both backgrounds

### Responsive Design

- [ ] Content readable at 320px viewport width (WCAG 1.4.10)
- [ ] No horizontal scrollbar at any standard breakpoint (320, 375, 768, 1024, 1280, 1536px)
- [ ] Touch targets at least 24px on mobile viewports
- [ ] Navigation adapts (sidebar collapses to hamburger menu on mobile)
- [ ] Tables use horizontal scroll wrapper OR reflow to cards on small screens
- [ ] Font sizes do not go below 14px on any viewport

### Visual Consistency

- [ ] Matches page template skeleton (List / Detail / Dashboard / Form / Content / Editor)
- [ ] Spacing consistent with `PageShell` size and density setting
- [ ] Typography follows scale (`text-2xl` for H1, `text-lg` for H2, `text-base` for body)
- [ ] Cards use consistent padding (`p-4` to `p-6`) and border radius (`rounded-lg`)
- [ ] Buttons follow size hierarchy (default for primary actions, `sm` for secondary)
- [ ] Icons are consistent in size and style (Lucide icon set)
- [ ] No orphaned elements floating outside the `PageShell` container

### Data & State

- [ ] Loading skeleton matches final content layout
- [ ] Error boundary catches render errors gracefully
- [ ] Empty state is meaningful (not blank white space)
- [ ] Optimistic updates for mutations (where applicable)
- [ ] Pagination or infinite scroll for lists exceeding 20 items

### Performance

- [ ] No layout shift (CLS) when content loads
- [ ] Images use lazy loading (`loading="lazy"`) below the fold
- [ ] Heavy components (charts, editors) are code-split (`React.lazy`)
- [ ] Page renders meaningful content within 1 second on fast 3G

---

## Sign-off

| Check | Reviewer | Date | Pass |
|-------|----------|------|------|
| Structure | | | |
| Accessibility | | | |
| Dark Mode | | | |
| Responsive | | | |
| Visual Consistency | | | |
| Performance | | | |

**Page approved:** [ ] Yes / [ ] No — Requires fixes listed above

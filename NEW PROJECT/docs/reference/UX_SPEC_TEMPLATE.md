# UX Specification Template

> **Purpose:** Structured handoff from UX/UI to Frontend Engineering.
> Copy this template for each new feature or significant UI change.

---

## Feature: [Feature Name]

**Designer:** [Name/Division] | **Date:** [YYYY-MM-DD] | **Phase:** [Phase N]

---

### 1. User Flow

```
[Entry Point] → [Step 1] → [Step 2] → [Success State]
                    ↓
              [Error State]
```

**Entry points:** (How does the user get here?)
- Sidebar nav item: `/path`
- CTA button on: [Parent Page]
- Deep link: [URL pattern]

### 2. Component States

| State | Description | Visual |
|-------|-------------|--------|
| **Loading** | Data fetching in progress | Skeleton shimmer |
| **Empty** | No data available | Illustration + CTA |
| **Populated** | Normal data display | [Describe layout] |
| **Error** | API/network failure | Error card with retry |
| **Offline** | No network connection | Offline banner |

### 3. Interaction Patterns

| Interaction | Behavior | Animation |
|-------------|----------|-----------|
| Click [element] | [Action] | [Duration/easing] |
| Hover [element] | [Feedback] | 150ms ease-in-out |
| Focus [element] | [Outline style] | Immediate |
| Drag [element] | [Drop zones] | [Constraint] |

### 4. Responsive Breakpoints

| Breakpoint | Layout Change |
|-----------|---------------|
| `< 640px` (sm) | [Stack vertically, hide sidebar] |
| `640-768px` (md) | [Two columns, condensed nav] |
| `768-1024px` (lg) | [Full layout, collapsible sidebar] |
| `> 1024px` (xl) | [Full layout, expanded sidebar] |

### 5. WCAG 2.2 AA Compliance

- [ ] Color contrast ratio ≥ 4.5:1 (normal text) / ≥ 3:1 (large text)
- [ ] All interactive elements keyboard-accessible (Tab, Enter, Escape)
- [ ] Focus visible on all focusable elements
- [ ] aria-label on icon-only buttons
- [ ] Screen reader announcement for dynamic content changes
- [ ] No content conveyed by color alone
- [ ] Touch targets ≥ 44×44px on mobile

### 6. Data Requirements

| Field | Source | Type | Fallback |
|-------|--------|------|----------|
| [field] | API query | string | "—" |
| [field] | Local state | number | 0 |

**API query name:** `[QUERY_NAME]`
**Required `data-testid` attributes:**

| Element | `data-testid` |
|---------|---------------|
| Page container | `page-[feature]` |
| Primary CTA | `btn-[action]` |
| List item | `item-[feature]-{id}` |

### 7. Error Handling

| Error Type | User Message | Recovery Action |
|-----------|-------------|-----------------|
| Network failure | "Unable to load. Please try again." | Retry button |
| Validation error | Field-level error message | Highlight field |
| Permission denied | "You don't have access to this feature." | Redirect to / |
| Not found | "This item was not found." | Back button |

### 8. Performance Budget

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle size (page) | < 50KB gzipped |

---

### Handoff Checklist

- [ ] All states designed (loading, empty, populated, error, offline)
- [ ] Responsive layouts for all breakpoints
- [ ] WCAG compliance verified
- [ ] `data-testid` attributes specified
- [ ] Error messages written
- [ ] Animation/transition specs included
- [ ] Performance budget agreed

---

*Template version: 1.0*

# Storybook Component Catalog

EduSphere uses Storybook 8 for component documentation, visual testing, and accessibility auditing.

## Running Storybook

```bash
pnpm --filter @edusphere/web storybook
# Opens at http://localhost:6006
```

## Building the static catalog

```bash
pnpm --filter @edusphere/web build-storybook
# Output: apps/web/storybook-static/
```

## Stories Location

All story files follow the pattern `src/**/*.stories.tsx`.

Current stories:

| Story | File | Description |
|-------|------|-------------|
| `Landing/MotionCard` | `src/components/landing/MotionCard.stories.tsx` | Framer Motion card with viewport-triggered fade-in. Three variants: Default, WithDelay, MultipleCards. |
| `Landing/AnimatedCounter` | `src/components/landing/AnimatedCounter.stories.tsx` | IntersectionObserver count-up counter. Four variants: Learners, Courses, WithPrefix, ShortDuration. |
| `Landing/TestimonialsCarousel` | `src/components/landing/TestimonialsCarousel.stories.tsx` | Auto-rotating 3-slide carousel with AnimatePresence. Pauses on hover. |
| `Certificates/CertificateCard` | `src/components/certificates/CertificateCard.stories.tsx` | Certificate card with verification code copy + PDF download. Four variants including LongCourseName and NoMetadata fallback. |

## Adding New Stories

1. Create `ComponentName.stories.tsx` next to the component file.
2. Export a `meta` object with `title` (hierarchical, e.g. `Pages/MyPage`) and `component`.
3. Wrap with any required context providers using `decorators`.
4. Export at least one named `Story` object with representative `args`.

### Provider Decorator Pattern

Components using `useReducedMotion` or any other React context must use a decorator:

```tsx
import { ReducedMotionProvider } from '@/providers/ReducedMotionProvider';

const meta: Meta<typeof MyComponent> = {
  decorators: [
    (Story) => (
      <ReducedMotionProvider>
        <Story />
      </ReducedMotionProvider>
    ),
  ],
};
```

## Accessibility in Storybook

The `@storybook/addon-a11y` addon (v8) runs axe-core on every rendered story.

- **color-contrast rule** is explicitly enabled (WCAG 2.2 SC 1.4.3).
- The Accessibility panel in the Storybook UI shows violations, incomplete checks, and passes.
- Any new component story with color-contrast violations must be fixed before merging.

## Storybook Configuration

| File | Purpose |
|------|---------|
| `apps/web/.storybook/main.ts` | Addon registration, Vite alias config (`@` → `src/`) |
| `apps/web/.storybook/preview.ts` | Global decorators, a11y config, control matchers |

## Argos CI Integration

Stories can be linked to Argos for visual regression — see `docs/testing/ARGOS-VISUAL-REGRESSION.md`.

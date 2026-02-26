import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Checkbox - shadcn/ui wrapper around Radix UI CheckboxPrimitive.
 *
 * WCAG 2.2 SC 2.5.8 (Target Size Minimum):
 *   The visible indicator is 16x16 px (h-4 w-4) per design spec, but the
 *   activation area must be >= 24x24 CSS pixels. We achieve this by adding
 *   min-h-[24px] min-w-[24px] to the Root without changing the visual size.
 *
 * WCAG 2.2 SC 2.4.11 (Focus Appearance):
 *   Focus ring is provided by the global *:focus-visible rule in globals.css
 *   (3 px solid #2563eb, offset 2 px). The Tailwind focus-visible:ring-2
 *   classes are kept for Radix-specific offset handling.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Activation area meets WCAG 2.2 SC 2.5.8 (24x24 px minimum)
      'min-h-[24px] min-w-[24px]',
      // Visual size kept at 16x16 px per design spec
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary',
      'ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };

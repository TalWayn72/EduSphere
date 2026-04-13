/**
 * JargonTooltip — hover/focus tooltip for a highlighted jargon term.
 *
 * Shows: Hebrew canonical form, short definition, "View full page →" link.
 * Wraps its child (the <mark> element) as the trigger.
 */

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JargonTooltipProps {
  termId: string;
  /** Hebrew canonical form displayed prominently */
  canonicalForm: string;
  /** 2-3 sentence definition */
  definitionShort: string;
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JargonTooltip({
  termId,
  canonicalForm,
  definitionShort,
  children,
}: JargonTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        {/* asChild so the <mark> itself becomes the Radix trigger */}
        <TooltipTrigger asChild>{children}</TooltipTrigger>

        <TooltipContent
          side="top"
          className="max-w-xs p-3 space-y-2 z-50"
          data-testid={`jargon-tooltip-${termId}`}
        >
          {/* Hebrew canonical form — RTL */}
          <p
            className="font-semibold text-sm text-foreground"
            dir="rtl"
            data-testid="jargon-canonical"
          >
            {canonicalForm}
          </p>

          {/* Short definition — auto direction (may be Hebrew or English) */}
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            dir="auto"
            data-testid="jargon-definition"
          >
            {definitionShort}
          </p>

          {/* Deep-link to glossary detail page */}
          <Link
            to={`/glossary/${termId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
            data-testid="jargon-glossary-link"
          >
            View full page
            <ArrowRight className="h-3 w-3" />
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

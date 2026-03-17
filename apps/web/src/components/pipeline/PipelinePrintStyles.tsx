/**
 * PipelinePrintStyles — print-friendly export for pipeline results.
 *
 * Provides:
 * 1. An "ייצוא PDF" button that triggers window.print()
 * 2. @media print rules that hide navigation/sidebars, show only results
 */
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  /** Lesson title shown in print header */
  lessonTitle: string;
  /** Whether there are results to export */
  hasResults: boolean;
}

export function PipelineExportButton({ lessonTitle, hasResults }: Props) {
  const handlePrint = useCallback(() => {
    // Set document title for PDF filename
    const prev = document.title;
    document.title = `Pipeline — ${lessonTitle}`;
    window.print();
    document.title = prev;
  }, [lessonTitle]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      disabled={!hasResults}
      className="print:hidden"
      data-testid="export-pdf-btn"
      aria-label="ייצוא PDF"
    >
      &#128438; ייצוא PDF
    </Button>
  );
}

/**
 * PipelinePrintStylesheet — inject @media print CSS rules.
 * Renders a <style> tag with print-specific overrides.
 */
export function PipelinePrintStylesheet() {
  return (
    <style>{`
      @media print {
        /* Hide everything except the print region */
        body > *:not(#root) { display: none !important; }

        /* Hide navigation, sidebars, toolbars, footers */
        nav, header, footer,
        [data-testid="layout-sidebar"],
        [data-testid="layout-topbar"],
        .print\\:hidden { display: none !important; }

        /* Pipeline-specific hides */
        [data-testid="config-panel"],
        [data-testid="template-picker"],
        [data-testid="run-history"],
        [data-testid="mobile-palette-toggle"],
        [data-testid="mobile-palette-sheet"],
        [data-testid="mobile-palette-backdrop"] { display: none !important; }

        /* Show the results area full-width */
        [data-testid="pipeline-run-status"] {
          border: none !important;
          max-height: none !important;
          overflow: visible !important;
          background: white !important;
          color: black !important;
          padding: 1rem !important;
        }

        /* Print header for results */
        [data-testid="print-header"] {
          display: block !important;
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
          border-bottom: 2px solid #333;
          padding-bottom: 0.5rem;
        }

        /* General print cleanup */
        * {
          box-shadow: none !important;
          text-shadow: none !important;
        }
        a { text-decoration: underline; }
        @page {
          margin: 2cm;
          size: A4;
        }
      }

      /* Hidden on screen, visible in print */
      [data-testid="print-header"] { display: none; }
    `}</style>
  );
}

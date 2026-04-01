/**
 * PipelineModulePalette — module palette for adding to the pipeline.
 *
 * Desktop (>=1024px): sidebar on the left.
 * Mobile (<1024px): collapsible bottom panel triggered by a floating button.
 */
import { useState } from 'react';
import {
  MODULE_LABELS,
  type PipelineModuleType,
} from '@/lib/lesson-pipeline.store';
import { Button } from '@/components/ui/button';

const ALL_MODULES: PipelineModuleType[] = [
  'INGESTION',
  'ASR',
  'NER_SOURCE_LINKING',
  'CONTENT_CLEANING',
  'SUMMARIZATION',
  'STRUCTURED_NOTES',
  'DIAGRAM_GENERATOR',
  'CITATION_VERIFIER',
  'QA_GATE',
  'PUBLISH_SHARE',
];

interface Props {
  onAddModule: (moduleType: PipelineModuleType) => void;
}

export function PipelineModulePalette({ onAddModule }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-56 border-r bg-muted overflow-y-auto p-3 shrink-0 print:hidden">
        <PaletteList onAdd={onAddModule} />
      </div>

      {/* Mobile floating button */}
      <div className="lg:hidden fixed bottom-4 left-4 z-40 print:hidden">
        <Button
          size="sm"
          className="rounded-full shadow-lg min-w-[44px] min-h-[44px]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'סגור חלונית מודולים' : 'פתח חלונית מודולים'}
          aria-expanded={mobileOpen}
          data-testid="mobile-palette-toggle"
        >
          {mobileOpen ? '✕' : '+ מודולים'}
        </Button>
      </div>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t shadow-2xl rounded-t-xl max-h-[50vh] overflow-y-auto p-4 animate-in slide-in-from-bottom print:hidden"
          role="dialog"
          aria-label="חלונית מודולים"
          data-testid="mobile-palette-sheet"
        >
          <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-3" />
          <PaletteList
            onAdd={(m) => {
              onAddModule(m);
              setMobileOpen(false);
            }}
          />
        </div>
      )}

      {/* Backdrop for mobile sheet */}
      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-20 bg-black/30 print:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="סגור חלונית מודולים"
          data-testid="mobile-palette-backdrop"
        />
      )}
    </>
  );
}

function PaletteList({ onAdd }: { onAdd: (m: PipelineModuleType) => void }) {
  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
        מודולים
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {ALL_MODULES.map((m) => (
          <button
            key={m}
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('moduleType', m)}
            onClick={() => onAdd(m)}
            className="bg-card border rounded-lg p-2 cursor-grab text-xs hover:border-blue-400 hover:shadow-sm active:cursor-grabbing text-start min-h-[44px] touch-manipulation"
            data-testid={`palette-module-${m}`}
          >
            <div className="font-medium">{MODULE_LABELS[m].he}</div>
            <div className="text-muted-foreground">{MODULE_LABELS[m].en}</div>
          </button>
        ))}
      </div>
    </>
  );
}

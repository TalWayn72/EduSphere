/**
 * PipelineToolbar — header bar with template picker, undo/redo, save/run buttons.
 * Responsive: wraps on small screens with min-height tap targets.
 */
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PipelineRunHistory } from '@/components/pipeline/PipelineRunHistory';
import { PipelineExportButton } from '@/components/pipeline/PipelinePrintStyles';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

interface ServerTemplate {
  id: string;
  name: string;
  description?: string | null;
  nodes: Array<{ moduleType: string }>;
  isSystem: boolean;
}

interface Props {
  courseId?: string;
  lessonId?: string;
  lessonTitle: string;
  isDirty: boolean;
  saving: boolean;
  isRunning: boolean;
  hasResults?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  serverTemplates: ServerTemplate[];
  nodes: PipelineNode[];
  onSave: () => void;
  onRun: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTemplateChange: (val: 'THEMATIC' | 'SEQUENTIAL' | 'CUSTOM') => void;
  onServerTemplate: (tpl: ServerTemplate) => void;
  onCreateTemplate: (name: string) => Promise<boolean>;
  onRestore: (run: { results: { id: string }[] }) => void;
}

export function PipelineToolbar({
  courseId, lessonId, lessonTitle, isDirty, saving, isRunning, hasResults,
  canUndo, canRedo, serverTemplates, nodes,
  onSave, onRun, onUndo, onRedo, onTemplateChange, onServerTemplate,
  onCreateTemplate, onRestore,
}: Props) {
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || nodes.length === 0) return;
    const ok = await onCreateTemplate(templateName.trim());
    if (ok) { setShowSaveTemplate(false); setTemplateName(''); }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 border-b bg-card shrink-0 gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <PageHeader
          title="Lesson Pipeline"
          breadcrumbs={[
            { label: 'Courses', href: '/courses' },
            { label: 'Course', href: `/courses/${courseId}` },
            { label: lessonTitle, href: `/courses/${courseId}/lessons/${lessonId}` },
            { label: 'Pipeline' },
          ]}
          className="mb-0"
        />
        <select
          className="text-xs border rounded px-2 py-1 bg-card min-h-[36px]"
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'CUSTOM' || val === 'THEMATIC' || val === 'SEQUENTIAL') {
              onTemplateChange(val);
            } else if (val.startsWith('server:')) {
              const tpl = serverTemplates.find((t) => t.id === val.slice(7));
              if (tpl) onServerTemplate(tpl);
            }
            (e.target as HTMLSelectElement).value = '';
          }}
          data-testid="template-picker"
        >
          <option value="">טעינת תבנית...</option>
          <option value="THEMATIC">תמטי (8 מודולים)</option>
          <option value="SEQUENTIAL">סדרתי (9 מודולים)</option>
          {serverTemplates.map((t) => (
            <option key={t.id} value={`server:${t.id}`}>
              {t.isSystem ? '🔒 ' : ''}{t.name} ({Array.isArray(t.nodes) ? t.nodes.length : 0})
            </option>
          ))}
          <option value="CUSTOM">בנה ידנית (מאפס)</option>
        </select>
        {lessonId && <PipelineRunHistory lessonId={lessonId} onRestore={onRestore} />}
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} data-testid="undo-btn" title="ביטול (Ctrl+Z)" className="min-h-[36px]">
          &#8617;
        </Button>
        <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} data-testid="redo-btn" title="שחזור (Ctrl+Shift+Z)" className="min-h-[36px]">
          &#8618;
        </Button>
        {showSaveTemplate ? (
          <div className="flex items-center gap-1">
            <input
              className="text-xs border rounded px-2 py-1 w-36 min-h-[36px]"
              placeholder="שם התבנית..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={100}
              data-testid="template-name-input"
            />
            <Button variant="outline" size="sm" onClick={() => void handleSaveAsTemplate()} disabled={!templateName.trim() || nodes.length === 0} data-testid="confirm-save-template" className="min-h-[36px]">
              שמור
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }} className="min-h-[36px]">
              &#10005;
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)} disabled={nodes.length === 0} data-testid="save-as-template-btn" className="min-h-[36px]">
            שמור כתבנית
          </Button>
        )}
        <PipelineExportButton lessonTitle={lessonTitle} hasResults={Boolean(hasResults)} />
        <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty || saving} data-testid="save-btn" className="min-h-[36px]">
          {saving ? 'שומר...' : 'שמור'}
        </Button>
        <Button size="sm" onClick={onRun} disabled={isRunning} data-testid="run-btn" className="min-h-[36px]">
          {isRunning ? '\u25B6 מריץ...' : '\u25B6 הפעל Pipeline'}
        </Button>
      </div>
    </div>
  );
}

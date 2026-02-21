import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { CourseModule, CourseFormData } from './course-create.types';

interface Props {
  modules: CourseModule[];
  onChange: (updates: Partial<CourseFormData>) => void;
}

function generateId(): string {
  return `module-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function CourseWizardStep2({ modules, onChange }: Props) {
  const { t } = useTranslation('courses');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const addModule = () => {
    if (!newTitle.trim()) return;
    const updated: CourseModule[] = [
      ...modules,
      { id: generateId(), title: newTitle.trim(), description: newDescription.trim() },
    ];
    onChange({ modules: updated });
    setNewTitle('');
    setNewDescription('');
  };

  const removeModule = (id: string) => {
    onChange({ modules: modules.filter((m) => m.id !== id) });
  };

  const moveModule = (index: number, direction: 'up' | 'down') => {
    const next = [...modules];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange({ modules: next });
  };

  return (
    <div className="space-y-6">
      {/* Existing modules */}
      {modules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">{t('wizard.noModulesYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, i) => (
            <Card key={mod.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Order controls */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveModule(i, 'up')}
                    disabled={i === 0}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveModule(i, 'down')}
                    disabled={i === modules.length - 1}
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Module info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('wizard.moduleNumber', { n: i + 1 })}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{mod.title}</p>
                  {mod.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {mod.description}
                    </p>
                  )}
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeModule(mod.id)}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  aria-label="Remove module"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add new module form */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-sm font-medium">{t('wizard.addModule')}</p>
        <div className="space-y-2">
          <Label htmlFor="module-title">{t('wizard.addModuleTitle')}</Label>
          <Input
            id="module-title"
            placeholder={t('wizard.addModuleTitlePlaceholder')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-desc">{t('wizard.addModuleDescriptionLabel')}</Label>
          <Textarea
            id="module-desc"
            placeholder={t('wizard.addModuleDescriptionPlaceholder')}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addModule}
          disabled={!newTitle.trim()}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t('wizard.addModule')}
        </Button>
      </div>
    </div>
  );
}

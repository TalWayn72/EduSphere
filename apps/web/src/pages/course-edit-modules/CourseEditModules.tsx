/**
 * CourseEditModules — Modules & Content tab for CourseEditPage.
 * Provides: add module, rename module, delete module, reorder,
 * and add content items within each module.
 */
import { useState } from 'react';
import type { CourseEditModulesProps, ModuleSummary } from './types';
import { useModuleMutations } from './useModuleMutations';
import { ModuleCard } from './ModuleCard';
import { AddModuleForm } from './AddModuleForm';

export function CourseEditModules({
  courseId,
  modules: initialModules,
  onRefetch,
  onToast,
}: CourseEditModulesProps) {
  const [modules, setModules] = useState<ModuleSummary[]>(
    [...initialModules].sort((a, b) => a.orderIndex - b.orderIndex)
  );

  const {
    pending,
    handleReorder,
    handleDeleteModule,
    handleSaveModuleTitle,
    handleAddModule,
    handleAddContentItem,
  } = useModuleMutations(courseId, modules, setModules, onRefetch, onToast);

  return (
    <div className="space-y-3">
      {modules.map((mod, index) => (
        <ModuleCard
          key={mod.id}
          mod={mod}
          index={index}
          totalModules={modules.length}
          isLoading={pending.has(mod.id)}
          onReorder={handleReorder}
          onDelete={handleDeleteModule}
          onSaveTitle={handleSaveModuleTitle}
          onAddContentItem={handleAddContentItem}
        />
      ))}
      <AddModuleForm onSubmit={handleAddModule} />
    </div>
  );
}

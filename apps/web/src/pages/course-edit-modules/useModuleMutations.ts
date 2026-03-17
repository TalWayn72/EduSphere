/**
 * Hook encapsulating all GraphQL mutations for modules and content items.
 */
import { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import {
  CREATE_MODULE_MUTATION,
  UPDATE_MODULE_MUTATION,
  DELETE_MODULE_MUTATION,
  REORDER_MODULES_MUTATION,
  CREATE_CONTENT_ITEM_MUTATION,
} from '@/lib/graphql/content.queries';
import type { ModuleSummary, NewModuleForm, NewItemForm } from './types';

function extractErrorMessage(error: {
  graphQLErrors?: Array<{ message: string }>;
  message: string;
}): string {
  // Log the raw error for debugging, return a user-friendly message
  const raw = error.graphQLErrors?.[0]?.message ?? error.message;
  console.error('[useModuleMutations] Mutation error:', raw);
  return 'Please try again.';
}

export function useModuleMutations(
  courseId: string,
  modules: ModuleSummary[],
  setModules: React.Dispatch<React.SetStateAction<ModuleSummary[]>>,
  onRefetch: () => void,
  onToast: (message: string) => void
) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  const [, executeCreateModule] = useMutation(CREATE_MODULE_MUTATION);
  const [, executeUpdateModule] = useMutation(UPDATE_MODULE_MUTATION);
  const [, executeDeleteModule] = useMutation(DELETE_MODULE_MUTATION);
  const [, executeReorder] = useMutation(REORDER_MODULES_MUTATION);
  const [, executeCreateItem] = useMutation(CREATE_CONTENT_ITEM_MUTATION);

  const setPendingFor = useCallback((id: string, on: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleReorder = useCallback(
    async (index: number, direction: 'up' | 'down') => {
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= modules.length) return;

      const reordered = [...modules];
      const tmp = reordered[index] as ModuleSummary;
      reordered[index] = reordered[swapIndex] as ModuleSummary;
      reordered[swapIndex] = tmp;
      setModules(reordered);

      const { error } = await executeReorder({
        courseId,
        moduleIds: reordered.map((m) => m.id),
      });
      if (error) {
        setModules(modules);
        onToast(`Reorder failed: ${extractErrorMessage(error)}`);
      } else {
        onRefetch();
      }
    },
    [courseId, modules, setModules, executeReorder, onRefetch, onToast]
  );

  const handleDeleteModule = useCallback(
    async (mod: ModuleSummary) => {
      if (
        !window.confirm(
          `Delete module "${mod.title}"? This will also remove all its content items.`
        )
      )
        return;
      setPendingFor(mod.id, true);
      const { error } = await executeDeleteModule({ id: mod.id });
      setPendingFor(mod.id, false);
      if (error) {
        onToast(`Delete failed: ${extractErrorMessage(error)}`);
      } else {
        setModules((prev) => prev.filter((m) => m.id !== mod.id));
        onToast(`Module "${mod.title}" deleted`);
      }
    },
    [setPendingFor, executeDeleteModule, setModules, onToast]
  );

  const handleSaveModuleTitle = useCallback(
    async (mod: ModuleSummary, editingTitle: string) => {
      const trimmed = editingTitle.trim();
      if (!trimmed || trimmed === mod.title) return false;
      setPendingFor(mod.id, true);
      const { error } = await executeUpdateModule({
        id: mod.id,
        input: { title: trimmed },
      });
      setPendingFor(mod.id, false);
      if (error) {
        onToast(`Rename failed: ${extractErrorMessage(error)}`);
      } else {
        setModules((prev) =>
          prev.map((m) => (m.id === mod.id ? { ...m, title: trimmed } : m))
        );
        onToast('Module renamed');
      }
      return true;
    },
    [setPendingFor, executeUpdateModule, setModules, onToast]
  );

  const handleAddModule = useCallback(
    async (form: NewModuleForm) => {
      const title = form.title.trim();
      if (!title) return false;
      const orderIndex = modules.length;
      const { data, error } = await executeCreateModule({
        input: {
          courseId,
          title,
          description: form.description || undefined,
          orderIndex,
        },
      });
      if (error) {
        onToast(`Create failed: ${extractErrorMessage(error)}`);
        return false;
      }
      if (data?.createModule) {
        setModules((prev) => [
          ...prev,
          { ...data.createModule, contentItems: [] },
        ]);
        onToast(`Module "${title}" created`);
        return true;
      }
      return false;
    },
    [courseId, modules.length, executeCreateModule, setModules, onToast]
  );

  const handleAddContentItem = useCallback(
    async (moduleId: string, form: NewItemForm) => {
      const title = form.title.trim();
      if (!title) return false;
      const module = modules.find((m) => m.id === moduleId);
      const orderIndex = module?.contentItems.length ?? 0;

      const { data, error } = await executeCreateItem({
        input: {
          moduleId,
          title,
          contentType: form.contentType,
          body: form.body || undefined,
          order: orderIndex,
        },
      });
      if (error) {
        onToast(`Failed: ${extractErrorMessage(error)}`);
        return false;
      }
      if (data?.createContentItem) {
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  contentItems: [...m.contentItems, data.createContentItem],
                }
              : m
          )
        );
        onToast(`"${title}" added to module`);
        return true;
      }
      return false;
    },
    [modules, executeCreateItem, setModules, onToast]
  );

  return {
    pending,
    handleReorder,
    handleDeleteModule,
    handleSaveModuleTitle,
    handleAddModule,
    handleAddContentItem,
  };
}

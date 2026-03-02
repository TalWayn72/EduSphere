/**
 * CourseEditModules — Modules & Content tab for CourseEditPage.
 * Provides: add module, rename module, delete module, reorder (↑↓),
 * and add content items within each module.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Loader2,
  Pencil,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  CREATE_MODULE_MUTATION,
  UPDATE_MODULE_MUTATION,
  DELETE_MODULE_MUTATION,
  REORDER_MODULES_MUTATION,
  CREATE_CONTENT_ITEM_MUTATION,
} from '@/lib/graphql/content.queries';

const CONTENT_TYPES = [
  'VIDEO',
  'PDF',
  'MARKDOWN',
  'QUIZ',
  'ASSIGNMENT',
  'LINK',
  'AUDIO',
  'RICH_DOCUMENT',
  'LIVE_SESSION',
  'SCORM',
] as const;

type ContentType = (typeof CONTENT_TYPES)[number];

interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  orderIndex: number;
}

interface ModuleSummary {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

interface Props {
  courseId: string;
  modules: ModuleSummary[];
  onRefetch: () => void;
  onToast: (message: string) => void;
}

// Badge color per content type
function typeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  if (['VIDEO', 'AUDIO'].includes(type)) return 'default';
  if (['QUIZ', 'ASSIGNMENT'].includes(type)) return 'secondary';
  return 'outline';
}

const TYPE_EMOJI: Record<string, string> = {
  VIDEO: '🎬',
  PDF: '📄',
  MARKDOWN: '📝',
  QUIZ: '❓',
  ASSIGNMENT: '✏️',
  LINK: '🔗',
  AUDIO: '🎧',
  RICH_DOCUMENT: '📖',
  LIVE_SESSION: '📡',
  SCORM: '📦',
};

interface NewModuleForm {
  title: string;
  description: string;
}
interface NewItemForm {
  title: string;
  contentType: ContentType;
  body: string;
}

export function CourseEditModules({
  courseId,
  modules: initialModules,
  onRefetch,
  onToast,
}: Props) {
  // Local copy for optimistic reorder
  const [modules, setModules] = useState<ModuleSummary[]>(
    [...initialModules].sort((a, b) => a.orderIndex - b.orderIndex)
  );

  // State: which module is expanded (shows content items)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // State: which module is being inline-renamed
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  // State: which module is showing "Add content item" form
  const [addItemModuleId, setAddItemModuleId] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    title: '',
    contentType: 'MARKDOWN',
    body: '',
  });
  // State: add-module form
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleForm, setNewModuleForm] = useState<NewModuleForm>({
    title: '',
    description: '',
  });
  // Pending operation tracker (per module id)
  const [pending, setPending] = useState<Set<string>>(new Set());

  const [, executeCreateModule] = useMutation(CREATE_MODULE_MUTATION);
  const [, executeUpdateModule] = useMutation(UPDATE_MODULE_MUTATION);
  const [, executeDeleteModule] = useMutation(DELETE_MODULE_MUTATION);
  const [, executeReorder] = useMutation(REORDER_MODULES_MUTATION);
  const [, executeCreateItem] = useMutation(CREATE_CONTENT_ITEM_MUTATION);

  const setPendingFor = (id: string, on: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Reorder: swap module at index with the one above/below
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
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
      setModules(modules); // revert on error
      onToast(
        `Reorder failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`
      );
    } else {
      onRefetch();
    }
  };

  const handleDeleteModule = async (mod: ModuleSummary) => {
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
      onToast(
        `Delete failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`
      );
    } else {
      setModules((prev) => prev.filter((m) => m.id !== mod.id));
      onToast(`Module "${mod.title}" deleted`);
    }
  };

  const handleSaveModuleTitle = async (mod: ModuleSummary) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === mod.title) {
      setEditingId(null);
      return;
    }
    setPendingFor(mod.id, true);
    const { error } = await executeUpdateModule({
      id: mod.id,
      input: { title: trimmed },
    });
    setPendingFor(mod.id, false);
    if (error) {
      onToast(
        `Rename failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`
      );
    } else {
      setModules((prev) =>
        prev.map((m) => (m.id === mod.id ? { ...m, title: trimmed } : m))
      );
      onToast('Module renamed');
    }
    setEditingId(null);
  };

  const handleAddModule = async () => {
    const title = newModuleForm.title.trim();
    if (!title) return;
    const orderIndex = modules.length;
    const { data, error } = await executeCreateModule({
      input: {
        courseId,
        title,
        description: newModuleForm.description || undefined,
        orderIndex,
      },
    });
    if (error) {
      onToast(
        `Create failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`
      );
    } else if (data?.createModule) {
      setModules((prev) => [
        ...prev,
        { ...data.createModule, contentItems: [] },
      ]);
      setNewModuleForm({ title: '', description: '' });
      setShowAddModule(false);
      onToast(`Module "${title}" created`);
    }
  };

  const handleAddContentItem = async (moduleId: string) => {
    const title = newItemForm.title.trim();
    if (!title) return;
    const module = modules.find((m) => m.id === moduleId);
    const orderIndex = module?.contentItems.length ?? 0;

    const { data, error } = await executeCreateItem({
      input: {
        moduleId,
        title,
        contentType: newItemForm.contentType,
        body: newItemForm.body || undefined,
        order: orderIndex,
      },
    });
    if (error) {
      onToast(`Failed: ${error.graphQLErrors?.[0]?.message ?? error.message}`);
    } else if (data?.createContentItem) {
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
      setNewItemForm({ title: '', contentType: 'MARKDOWN', body: '' });
      setAddItemModuleId(null);
      onToast(`"${title}" added to module`);
    }
  };

  return (
    <div className="space-y-3">
      {modules.map((mod, index) => {
        const isExpanded = expandedId === mod.id;
        const isEditing = editingId === mod.id;
        const isLoading = pending.has(mod.id);
        const isAddingItem = addItemModuleId === mod.id;

        return (
          <Card key={mod.id}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                {/* Reorder buttons */}
                <div className="flex flex-col shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleReorder(index, 'up')}
                    disabled={index === 0}
                    aria-label="Move module up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => handleReorder(index, 'down')}
                    disabled={index === modules.length - 1}
                    aria-label="Move module down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Title or edit input */}
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveModuleTitle(mod);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleSaveModuleTitle(mod)}
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <CardTitle
                    className="flex-1 text-sm font-medium cursor-pointer hover:underline min-w-0 truncate"
                    onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      {mod.title}
                      <Badge
                        variant="outline"
                        className="ml-1 text-xs font-normal"
                      >
                        {mod.contentItems.length} items
                      </Badge>
                    </span>
                  </CardTitle>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingId(mod.id);
                            setEditingTitle(mod.title);
                          }}
                          aria-label="Rename module"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteModule(mod)}
                          aria-label="Delete module"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Expanded: content items + add item form */}
            {isExpanded && (
              <CardContent className="pt-0 pb-3 px-4 space-y-2">
                {mod.contentItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-2">
                    No content items yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5 pl-2">
                    {[...mod.contentItems]
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span>{TYPE_EMOJI[item.contentType] ?? '📄'}</span>
                          <span className="flex-1 truncate">{item.title}</span>
                          <Badge
                            variant={typeBadgeVariant(item.contentType)}
                            className="text-xs"
                          >
                            {item.contentType}
                          </Badge>
                        </li>
                      ))}
                  </ul>
                )}

                {/* Add content item toggle */}
                {isAddingItem ? (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <p className="text-xs font-medium">Add Content Item</p>
                    <Input
                      placeholder="Title *"
                      value={newItemForm.title}
                      onChange={(e) =>
                        setNewItemForm((f) => ({ ...f, title: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                    <Select
                      value={newItemForm.contentType}
                      onValueChange={(v) =>
                        setNewItemForm((f) => ({
                          ...f,
                          contentType: v as ContentType,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        aria-label="Content type"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_EMOJI[t]} {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Body text / URL (optional)"
                      value={newItemForm.body}
                      onChange={(e) =>
                        setNewItemForm((f) => ({ ...f, body: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddContentItem(mod.id)}
                        disabled={!newItemForm.title.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddItemModuleId(null);
                          setNewItemForm({
                            title: '',
                            contentType: 'MARKDOWN',
                            body: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7 pl-2"
                    onClick={() => setAddItemModuleId(mod.id)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Content Item
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add Module */}
      {showAddModule ? (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4 space-y-3">
            <p className="text-sm font-medium">New Module</p>
            <Input
              placeholder="Module title *"
              value={newModuleForm.title}
              onChange={(e) =>
                setNewModuleForm((f) => ({ ...f, title: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddModule();
                if (e.key === 'Escape') setShowAddModule(false);
              }}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={newModuleForm.description}
              onChange={(e) =>
                setNewModuleForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddModule}
                disabled={!newModuleForm.title.trim()}
              >
                Create Module
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddModule(false);
                  setNewModuleForm({ title: '', description: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={() => setShowAddModule(true)}
        >
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      )}
    </div>
  );
}

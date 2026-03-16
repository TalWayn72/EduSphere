/**
 * A single module card with reorder, rename, delete, and content items.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { ModuleSummary, NewItemForm } from './types';
import { ContentItemList } from './ContentItemList';
import { AddContentItemForm } from './AddContentItemForm';

interface ModuleCardProps {
  mod: ModuleSummary;
  index: number;
  totalModules: number;
  isLoading: boolean;
  onReorder: (index: number, direction: 'up' | 'down') => void;
  onDelete: (mod: ModuleSummary) => void;
  onSaveTitle: (mod: ModuleSummary, title: string) => Promise<boolean>;
  onAddContentItem: (moduleId: string, form: NewItemForm) => Promise<boolean>;
}

export function ModuleCard({
  mod,
  index,
  totalModules,
  isLoading,
  onReorder,
  onDelete,
  onSaveTitle,
  onAddContentItem,
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const startEditing = () => {
    setIsEditing(true);
    setEditingTitle(mod.title);
  };

  const handleSave = async () => {
    await onSaveTitle(mod, editingTitle);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          {/* Reorder buttons */}
          <div className="flex flex-col shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => onReorder(index, 'up')}
              disabled={index === 0}
              aria-label="Move module up"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => onReorder(index, 'down')}
              disabled={index === totalModules - 1}
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
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="h-7 text-sm"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleSave}
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <CardTitle
              className="flex-1 text-sm font-medium cursor-pointer hover:underline min-w-0 truncate"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
                {mod.title}
                <Badge variant="outline" className="ml-1 text-xs font-normal">
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
                    onClick={startEditing}
                    aria-label="Rename module"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDelete(mod)}
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
          <ContentItemList items={mod.contentItems} />

          {isAddingItem ? (
            <AddContentItemForm
              moduleId={mod.id}
              onSubmit={onAddContentItem}
              onCancel={() => setIsAddingItem(false)}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7 pl-2"
              onClick={() => setIsAddingItem(true)}
            >
              <Plus className="h-3 w-3" />
              Add Content Item
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

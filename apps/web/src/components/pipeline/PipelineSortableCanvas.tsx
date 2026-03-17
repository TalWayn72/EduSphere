/**
 * PipelineSortableCanvas — accessible drag-and-drop canvas using @dnd-kit.
 *
 * Keyboard support: Tab to focus, Space to pick up, Arrow keys to move,
 * Space to drop, Escape to cancel.
 * WCAG 2.1 AA: aria-roledescription, aria-describedby, live announcements.
 */
import { useCallback, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Announcements,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PipelineNode, PipelineModuleType } from '@/lib/lesson-pipeline.store';
import { MODULE_LABELS } from '@/lib/lesson-pipeline.store';
import { SortablePipelineNode } from './SortablePipelineNode';

interface Props {
  nodes: PipelineNode[];
  selectedNodeId: string | null;
  customMode: boolean;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onDropModule: (moduleType: PipelineModuleType) => void;
}

function getNodeLabel(moduleType: string): string {
  const labels = MODULE_LABELS[moduleType as PipelineModuleType];
  return labels ? labels.he : moduleType;
}

export function PipelineSortableCanvas({
  nodes, selectedNodeId, customMode, onSelect, onRemove, onReorder, onDropModule,
}: Props) {
  const instructionsId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }: DragStartEvent) => {
      const node = nodes.find((n) => n.id === active.id);
      return node ? `הרמת ${getNodeLabel(node.moduleType)}` : '';
    },
    onDragOver: ({ active, over }) => {
      if (!over) return '';
      const aNode = nodes.find((n) => n.id === active.id);
      const oNode = nodes.find((n) => n.id === over.id);
      if (!aNode || !oNode) return '';
      return `${getNodeLabel(aNode.moduleType)} מעל ${getNodeLabel(oNode.moduleType)}`;
    },
    onDragEnd: ({ active, over }) => {
      if (!over || active.id === over.id) return 'הביטול בוצע';
      const node = nodes.find((n) => n.id === active.id);
      const overNode = nodes.find((n) => n.id === over.id);
      if (!node || !overNode) return '';
      return `${getNodeLabel(node.moduleType)} הונח אחרי ${getNodeLabel(overNode.moduleType)}`;
    },
    onDragCancel: () => 'הגרירה בוטלה',
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = nodes.findIndex((n) => n.id === active.id);
    const newIdx = nodes.findIndex((n) => n.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorder(oldIdx, newIdx);
  }, [nodes, onReorder]);

  const handleNativeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const moduleType = e.dataTransfer.getData('moduleType') as PipelineModuleType;
    if (moduleType) onDropModule(moduleType);
  };

  if (nodes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-xl min-h-[200px]"
        data-testid="empty-canvas"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleNativeDrop}
      >
        {customMode ? (
          <>
            <p className="text-4xl mb-3">&#x1F527;</p>
            <p className="text-lg font-medium text-blue-600">מצב בנייה חופשית</p>
            <p className="text-sm mt-1">גרור מודולים מהחלונית השמאלית לכאן</p>
          </>
        ) : (
          <>
            <p className="text-4xl mb-3">&#x1F517;</p>
            <p className="text-lg font-medium">גרור מודולים לכאן</p>
            <p className="text-sm">בנה את ה-Pipeline שלך, או בחר תבנית מהסרגל</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleNativeDrop}
      className="min-h-[200px]"
    >
      <p id={instructionsId} className="sr-only">
        השתמש במקש Tab כדי לנווט בין מודולים. לחץ רווח כדי להרים, חצים כדי להזיז, רווח כדי להניח, Escape לביטול.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 max-w-lg mx-auto" role="list" aria-describedby={instructionsId}>
            {nodes.map((node, idx) => (
              <SortablePipelineNode
                key={node.id}
                node={node}
                idx={idx}
                total={nodes.length}
                isSelected={selectedNodeId === node.id}
                onSelect={() => onSelect(selectedNodeId === node.id ? null : node.id)}
                onRemove={() => onRemove(node.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

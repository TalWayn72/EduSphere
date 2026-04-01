import { cn } from '@/lib/utils';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import type { LayoutNode } from './KnowledgeSkillTree.types';
import {
  MASTERY_ICON,
  MASTERY_LABEL,
  NODE_W,
  NODE_H,
} from './KnowledgeSkillTree.types';

interface SkillTreeNodeProps {
  node: LayoutNode;
  isSelected: boolean;
  isFocused: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  posInSet: number;
  setSize: number;
  viewMinX: number;
  viewMinY: number;
  onFocus: (id: string) => void;
  onActivate: (id: string) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

export function SkillTreeNode({
  node,
  isSelected,
  isFocused,
  isExpanded,
  hasChildren,
  posInSet,
  setSize,
  viewMinX,
  viewMinY,
  onFocus,
  onActivate,
  buttonRef,
}: SkillTreeNodeProps) {
  const isClickable = node.unlocked;

  return (
    <button
      ref={buttonRef}
      role="treeitem"
      aria-level={node.depth}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      aria-label={`${node.label}, ${MASTERY_LABEL[node.mastery]} mastery`}
      tabIndex={isFocused ? 0 : -1}
      data-testid={`skill-node-${node.id}`}
      onClick={() => {
        onFocus(node.id);
        onActivate(node.id);
      }}
      disabled={!isClickable}
      style={{
        position: 'absolute',
        left: node.x - viewMinX,
        top: node.y - viewMinY,
        width: NODE_W,
        height: NODE_H,
      }}
      className={cn(
        'flex flex-col justify-between p-3 rounded-lg border bg-card shadow-sm text-left transition-all',
        isClickable
          ? 'hover:shadow-md cursor-pointer'
          : 'opacity-40 cursor-not-allowed',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-1',
        isFocused && 'outline-2 outline-indigo-400 outline-offset-1'
      )}
    >
      {/* Node header */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="text-base leading-none flex-shrink-0"
          aria-hidden="true"
        >
          {MASTERY_ICON[node.mastery]}
        </span>
        <span
          className="text-xs font-semibold text-foreground truncate"
          data-testid={`skill-node-label-${node.id}`}
        >
          {node.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full" data-testid={`skill-node-progress-${node.id}`}>
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] text-muted-foreground">
            {node.progress}%
          </span>
        </div>
        <div
          className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={node.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${node.label} progress`}
        >
          <div
            className="h-full bg-indigo-500 rounded-full transition-all dark:bg-indigo-600"
            style={{ width: `${node.progress}%` }}
          />
        </div>
      </div>

      {/* Mastery badge */}
      <MasteryBadge level={node.mastery} size="sm" />
    </button>
  );
}

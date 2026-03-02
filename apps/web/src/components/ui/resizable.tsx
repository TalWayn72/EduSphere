'use client';

/**
 * resizable.tsx — shadcn/ui wrapper for react-resizable-panels v4.
 *
 * v4 uses inline styles (flexDirection) instead of data-panel-group-direction
 * attributes, so the old CSS data selectors never fire.  We use a React
 * context to propagate orientation from Group → Separator so the handle
 * gets the right CSS in both horizontal and vertical groups.
 */
import { createContext, useContext } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type Orientation = 'horizontal' | 'vertical';

const OrientationCtx = createContext<Orientation>('horizontal');

const ResizablePanelGroup = ({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof Group>) => (
  <OrientationCtx.Provider value={orientation}>
    <Group
      className={cn('flex h-full w-full', className)}
      orientation={orientation}
      {...props}
    />
  </OrientationCtx.Provider>
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => {
  const orientation = useContext(OrientationCtx);
  const isVertical = orientation === 'vertical';

  return (
    <Separator
      className={cn(
        'relative flex items-center justify-center bg-border',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        isVertical
          ? // horizontal bar spanning full width — between top/bottom panels
            'h-2 w-full flex-col after:absolute after:inset-x-0 after:top-1/2 after:h-1 after:-translate-y-1/2'
          : // vertical bar spanning full height — between left/right panels
            'w-2 after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            'z-10 flex items-center justify-center rounded-sm border bg-border',
            isVertical ? 'h-3 w-6' : 'h-6 w-3'
          )}
        >
          <GripVertical className={cn('h-3 w-3', isVertical && 'rotate-90')} />
        </div>
      )}
    </Separator>
  );
};

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

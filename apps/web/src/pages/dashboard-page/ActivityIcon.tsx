import React from 'react';

const BASE_CLASS =
  'h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0';

const COLOR_MAP: Record<string, string> = {
  study: 'bg-primary/10 text-primary',
  quiz: 'bg-success/10 text-success',
  ai: 'bg-accent/10 text-accent',
  annotation: 'bg-warning/10 text-warning',
  course: 'bg-info/10 text-info',
};

const LABEL_MAP: Record<string, string> = {
  study: 'S',
  quiz: 'Q',
  ai: 'AI',
  annotation: 'A',
  course: 'C',
};

export const ActivityIcon = React.memo(function ActivityIcon({
  type,
}: {
  type: string;
}) {
  return (
    <div
      className={`${BASE_CLASS} ${COLOR_MAP[type] ?? COLOR_MAP['study']}`}
      aria-hidden
    >
      {LABEL_MAP[type] ?? 'S'}
    </div>
  );
});

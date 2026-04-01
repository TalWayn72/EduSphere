import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  level?: 'h2' | 'h3';
  description?: string;
  actions?: React.ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeader({
  title,
  level = 'h2',
  description,
  actions,
  id,
  className,
}: SectionHeaderProps) {
  const Tag = level;
  const headingId = id ?? title.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <Tag
          id={headingId}
          className={cn(
            'font-semibold tracking-tight text-foreground',
            level === 'h2' ? 'text-lg' : 'text-base'
          )}
        >
          {title}
        </Tag>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

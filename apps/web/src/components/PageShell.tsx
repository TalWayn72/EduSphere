import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: '',
} as const;

const SPACING_MAP = {
  compact: 'space-y-4',
  normal: 'space-y-6',
  relaxed: 'space-y-8',
} as const;

interface PageShellProps {
  children: React.ReactNode;
  size?: keyof typeof SIZE_MAP;
  spacing?: keyof typeof SPACING_MAP;
  className?: string;
  'data-testid'?: string;
}

export function PageShell({
  children,
  size = 'md',
  spacing = 'normal',
  className,
  'data-testid': testId,
}: PageShellProps) {
  return (
    <div
      data-testid={testId ?? 'page-shell'}
      className={cn(
        SIZE_MAP[size],
        size !== 'full' && 'mx-auto px-4 sm:px-6 lg:px-8',
        SPACING_MAP[spacing],
        className,
      )}
    >
      {children}
    </div>
  );
}

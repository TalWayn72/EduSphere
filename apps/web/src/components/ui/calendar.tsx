import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface CalendarProps {
  /** Currently selected date */
  selected?: Date;
  /** Callback when a date is selected */
  onSelect?: (date: Date) => void;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Additional CSS classes */
  className?: string;
}

const DAY_KEYS = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
] as const;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateDisabled(date: Date, min?: Date, max?: Date): boolean {
  if (min && date < new Date(min.getFullYear(), min.getMonth(), min.getDate())) {
    return true;
  }
  if (max && date > new Date(max.getFullYear(), max.getMonth(), max.getDate())) {
    return true;
  }
  return false;
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const { t } = useTranslation('common');
  const [viewDate, setViewDate] = React.useState(
    () => selected ?? new Date()
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () =>
    setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setViewDate(new Date(year, month + 1, 1));

  const days: (number | null)[] = [
    ...Array.from<null>({ length: firstDay }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className={cn('w-72 rounded-lg border bg-card p-4 shadow-sm', className)}
      data-testid="calendar"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          aria-label={t('calendar.previousMonth')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium" aria-live="polite">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          aria-label={t('calendar.nextMonth')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
        {DAY_KEYS.map((key) => (
          <span key={key} className="py-1">
            {t(`calendar.${key}`)}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={monthLabel}
      >
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const date = new Date(year, month, day);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const disabled = isDateDisabled(date, minDate, maxDate);

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(date)}
              aria-selected={isSelected}
              className={cn(
                'h-8 w-8 rounded-md text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:pointer-events-none disabled:opacity-50',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ConfigField + ConfigSelect — reusable form primitives for pipeline config.
 */
import React from 'react';

/** Field with optional tooltip icon. */
export function ConfigField({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
        {label}
        {tooltip && (
          <span
            title={tooltip}
            className="cursor-help text-muted-foreground hover:text-foreground ml-1"
            aria-label={tooltip}
            data-testid="field-tooltip"
          >
            {'\u24D8'}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/** Simple native select wrapper. */
export function ConfigSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded px-2 py-1.5 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

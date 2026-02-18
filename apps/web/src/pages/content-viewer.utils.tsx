/** Shared utilities and constants for the ContentViewer page */
import React from 'react';

// Layer display metadata (label, colours)
export const LAYER_META: Record<string, { label: string; color: string; bg: string }> = {
  PERSONAL: {
    label: 'Personal',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
  },
  SHARED: {
    label: 'Shared',
    color: 'text-blue-700',
    bg: 'bg-blue-50   border-blue-200',
  },
  INSTRUCTOR: {
    label: 'Instructor',
    color: 'text-green-700',
    bg: 'bg-green-50  border-green-200',
  },
  AI_GENERATED: {
    label: 'AI',
    color: 'text-amber-700',
    bg: 'bg-amber-50  border-amber-200',
  },
};

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** Format seconds as M:SS */
export function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Highlight matching query text in a string (returns JSX) */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const lower = query.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

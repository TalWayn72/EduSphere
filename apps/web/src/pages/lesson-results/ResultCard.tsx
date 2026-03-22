import { useState } from 'react';

// ── ResultCard ───────────────────────────────────────────────────────────────

export function ResultCard({ icon, title, children, testId }: {
  icon: string; title: string; children: React.ReactNode; testId: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4" data-testid={testId}>
      <h2 className="text-base font-semibold mb-3">{icon} {title}</h2>
      {children}
    </div>
  );
}

// ── ExpandableText ───────────────────────────────────────────────────────────

export function ExpandableText({ text, limit = 600, testId }: { text: string; limit?: number; testId: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > limit && !expanded;
  return (
    <div>
      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed text-foreground" data-testid={testId}>
        {truncated ? text.slice(0, limit) + '...' : text}
      </pre>
      {text.length > limit && (
        <button
          className="text-xs text-blue-600 hover:underline mt-1 dark:text-blue-400"
          onClick={() => setExpanded(!expanded)}
          data-testid={`${testId}-expand`}
        >
          {expanded ? 'הצג פחות' : `הצג עוד (${text.length} תווים)`}
        </button>
      )}
    </div>
  );
}

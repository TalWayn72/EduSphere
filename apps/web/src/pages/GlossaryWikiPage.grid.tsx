/**
 * GlossaryTermGrid — card grid for the glossary list view.
 * Extracted to keep GlossaryWikiPage under 150 lines.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import type { JargonTerm } from '@/types/jargon.types';

interface GlossaryTermGridProps {
  terms: JargonTerm[];
}

export function GlossaryTermGrid({ terms }: GlossaryTermGridProps) {
  const { t } = useTranslation('glossary');

  if (terms.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-16">
        {t(
          'noTerms',
          'No terms found. Try adjusting your search or domain filter.'
        )}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {terms.map((term) => (
        <Link
          key={term.id}
          to={`/glossary/${term.id}`}
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
          data-testid={`glossary-term-card-${term.id}`}
        >
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p
              className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug"
              dir="auto"
            >
              {term.canonicalForm}
            </p>
          </div>

          {term.definitionShort && (
            <p
              className="text-xs text-muted-foreground leading-relaxed line-clamp-3"
              dir="auto"
            >
              {term.definitionShort}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {term.language}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(term.confidence * 100)}%
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * GlossaryTermDetail — full wiki detail view for a single glossary term.
 * Extracted to keep GlossaryWikiPage under 150 lines.
 *
 * Shows: canonical form, phonetic hint, alt forms, wiki content (Markdown),
 * lesson cross-references with deep-link timestamps, related terms.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonRef {
  lessonId: string;
  lessonTitle: string;
  firstMentionTime: number | null;
}

interface RelatedTerm {
  id: string;
  canonicalForm: string;
  definitionShort: string;
}

export interface GlossaryWikiEntry {
  id: string;
  canonicalForm: string;
  phoneticHint: string | null;
  altForms: string[];
  definitionShort: string;
  wikiContent: string | null;
  language: string;
  confidence: number;
  lessonRefs: LessonRef[];
  relatedTerms: RelatedTerm[];
}

interface GlossaryTermDetailProps {
  entry: GlossaryWikiEntry;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlossaryTermDetail({ entry }: GlossaryTermDetailProps) {
  const { t } = useTranslation('glossary');

  return (
    <article className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground" dir="auto">
          {entry.canonicalForm}
        </h1>
        {entry.phoneticHint && (
          <p className="text-sm text-muted-foreground font-mono">
            [{entry.phoneticHint}]
          </p>
        )}
        {entry.altForms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.altForms.map((f) => (
              <Badge key={f} variant="secondary" className="text-xs" dir="auto">
                {f}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-foreground/80 leading-relaxed" dir="auto">
          {entry.definitionShort}
        </p>
      </header>

      {/* Wiki content — rendered as preformatted for now (Markdown requires remark) */}
      {entry.wikiContent && (
        <section>
          <h2 className="text-base font-semibold mb-2">
            {t('wikiContent', 'Extended notes')}
          </h2>
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted/40 px-4 py-3 text-sm"
            dir="auto"
          >
            <pre className="whitespace-pre-wrap font-sans">
              {entry.wikiContent}
            </pre>
          </div>
        </section>
      )}

      {/* Lesson cross-references */}
      {entry.lessonRefs.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('lessonRefs', 'Appears in')}
          </h2>
          <ul className="space-y-1.5">
            {entry.lessonRefs.map((ref) => (
              <li key={ref.lessonId}>
                <Link
                  to={`/learn/${ref.lessonId}${ref.firstMentionTime != null ? `?t=${ref.firstMentionTime}` : ''}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  {ref.lessonTitle}
                  {ref.firstMentionTime != null && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(ref.firstMentionTime)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related terms */}
      {entry.relatedTerms.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-2">
            {t('relatedTerms', 'Related terms')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {entry.relatedTerms.map((rt) => (
              <Link
                key={rt.id}
                to={`/glossary/${rt.id}`}
                className="rounded-full border bg-card px-3 py-1 text-xs hover:border-primary/50 transition-colors"
                dir="auto"
                title={rt.definitionShort}
              >
                {rt.canonicalForm}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

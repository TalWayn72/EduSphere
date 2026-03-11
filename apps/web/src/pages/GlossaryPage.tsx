import React, { useState, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { PageMeta, BreadcrumbSchema, OrganizationSchema } from '@/components/seo';
import { safeJsonLd } from '@/lib/safe-json-ld';
import { GLOSSARY_TERMS } from '@/lib/aeo-data';
import type { GlossaryTerm } from '@/lib/aeo-data';
import { Input } from '@/components/ui/input';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Technology':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Pedagogy:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Standards:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Technical:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function GlossaryTermCard({ term }: { term: GlossaryTerm }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      id={term.term.toLowerCase().replace(/\s+/g, '-')}
      className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg p-5"
      itemScope
      itemType="https://schema.org/DefinedTerm"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h2
          className="text-lg font-bold text-gray-900 dark:text-foreground"
          itemProp="name"
        >
          {term.term}
        </h2>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${CATEGORY_COLORS[term.category] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {term.category}
        </span>
      </div>
      <p
        className="text-gray-600 dark:text-muted-foreground text-sm leading-relaxed"
        itemProp="description"
      >
        {term.shortDef}
      </p>
      {expanded && (
        <p className="mt-3 text-gray-500 dark:text-muted-foreground text-sm leading-relaxed border-t border-gray-100 dark:border-border pt-3">
          {term.fullDef}
        </p>
      )}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </article>
  );
}

export function GlossaryPage() {
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return GLOSSARY_TERMS.filter((t) => {
      const matchesSearch =
        search === '' ||
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.shortDef.toLowerCase().includes(search.toLowerCase());
      const matchesLetter =
        activeLetter === null || t.term.toUpperCase().startsWith(activeLetter);
      return matchesSearch && matchesLetter;
    });
  }, [search, activeLetter]);

  const definedTermSetSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'EduSphere Educational Technology Glossary',
    description:
      'Definitions of key terms in educational technology, AI learning, and e-learning standards.',
    url: 'https://app.edusphere.dev/glossary',
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.shortDef,
      url: `https://app.edusphere.dev/glossary#${t.term.toLowerCase().replace(/\s+/g, '-')}`,
    })),
  };

  return (
    <>
      <PageMeta
        title="EdTech Glossary — Educational Technology Terms"
        description="Comprehensive glossary of educational technology terms: Knowledge Graph, AI Tutoring, SCORM, xAPI, LTI, Gamification, pgvector, Bloom's Taxonomy, and more."
        canonical="https://app.edusphere.dev/glossary"
      />
      <Helmet>
        <script type="application/ld+json">{safeJsonLd(definedTermSetSchema)}</script>
      </Helmet>
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'Glossary', url: 'https://app.edusphere.dev/glossary' },
        ]}
      />
      <OrganizationSchema />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-10 w-10 text-indigo-300" aria-hidden="true" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">EdTech Glossary</h1>
            <p className="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
              Definitions of key terms in AI learning, educational technology, and e-learning
              standards.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white text-gray-900 border-0"
                aria-label="Search glossary terms"
              />
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Alphabet Navigation */}
          <nav aria-label="Alphabetical navigation" className="flex flex-wrap gap-1 mb-8">
            <button
              onClick={() => setActiveLetter(null)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                activeLetter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-card text-gray-600 dark:text-muted-foreground hover:bg-indigo-50 dark:hover:bg-accent border border-gray-200 dark:border-border'
              }`}
              aria-pressed={activeLetter === null}
            >
              All
            </button>
            {LETTERS.map((letter) => {
              const hasTerms = GLOSSARY_TERMS.some((t) =>
                t.term.toUpperCase().startsWith(letter)
              );
              return (
                <button
                  key={letter}
                  onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                  disabled={!hasTerms}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    activeLetter === letter
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-card text-gray-600 dark:text-muted-foreground hover:bg-indigo-50 dark:hover:bg-accent border border-gray-200 dark:border-border'
                  }`}
                  aria-pressed={activeLetter === letter}
                >
                  {letter}
                </button>
              );
            })}
          </nav>

          {/* Term count */}
          <p className="text-sm text-gray-500 dark:text-muted-foreground mb-6">
            Showing {filtered.length} of {GLOSSARY_TERMS.length} terms
          </p>

          {/* Terms Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-muted-foreground">
              <p>No terms found matching &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((term) => (
                <GlossaryTermCard key={term.term} term={term} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default GlossaryPage;

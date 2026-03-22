/**
 * SlugField — Subdomain input with live availability checking.
 * Extracted from OrgDetailsStep for file-size compliance.
 */
import React from 'react';
import { useQuery } from 'urql';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CHECK_SLUG_QUERY = `
  query CheckSlugAvailability($slug: String!) {
    checkSlugAvailability(slug: $slug) {
      available
      suggestions
    }
  }
`;

interface SlugFieldProps {
  slug: string;
  slugQuery: string;
  checkingSlug?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSuggestionPick: (slug: string) => void;
  error?: string;
  t: (key: string) => string;
}

export function SlugField({
  slug, slugQuery, onChange, onSuggestionPick, error, t,
}: SlugFieldProps) {
  const [{ data: slugData, fetching: checking }] = useQuery({
    query: CHECK_SLUG_QUERY,
    variables: { slug: slugQuery },
    pause: !slugQuery || slugQuery.length < 3,
  });

  const slugAvailable = slugData?.checkSlugAvailability?.available;
  const suggestions = slugData?.checkSlugAvailability?.suggestions as string[] | undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor="slug">{t('org.slugLabel')} *</Label>
      <div className="flex items-center gap-1">
        <Input
          id="slug"
          value={slug || ''}
          onChange={onChange}
          className="flex-1"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby="slug-preview"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          .edusphere.io
        </span>
      </div>
      <p id="slug-preview" className="text-xs text-muted-foreground">
        {slug && `https://${slug}.edusphere.io`}
      </p>
      {checking && (
        <p className="text-xs text-muted-foreground">{t('org.checkingSlug')}</p>
      )}
      {!checking && slugAvailable === false && (
        <div>
          <p className="text-destructive text-xs" role="alert">{t('org.slugTaken')}</p>
          {suggestions && suggestions.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs text-primary underline"
                  onClick={() => onSuggestionPick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!checking && slugAvailable === true && (
        <p className="text-xs text-green-600 dark:text-green-400" role="status">{t('org.slugAvailable')}</p>
      )}
      {error && (
        <p className="text-destructive text-xs mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}

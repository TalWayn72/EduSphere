/**
 * DomainSelector — Reusable domain picker with search and hierarchy display.
 * Used in JargonManagementPage and DomainConfirmationModal.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JARGON_DOMAINS_QUERY } from '@/lib/graphql/jargon.queries';
import type { JargonDomain } from '@/types/jargon.types';

interface Props {
  value: string | null;
  onChange: (domainId: string | null, domain: JargonDomain | null) => void;
  language?: string;
  placeholder?: string;
  className?: string;
}

export function DomainSelector({
  value,
  onChange,
  language,
  placeholder,
  className,
}: Props) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching }] = useQuery<{ jargonDomains: JargonDomain[] }>({
    query: JARGON_DOMAINS_QUERY,
    variables: { language },
    pause: !mounted,
  });

  const domains = data?.jargonDomains ?? [];

  const filtered = domains.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = value ? domains.find((d) => d.id === value) : null;

  const handleSelect = useCallback(
    (domain: JargonDomain) => {
      onChange(domain.id, domain);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null, null);
    setOpen(false);
  }, [onChange]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-label={t('jargon.domainSelector.ariaLabel', 'Select domain')}
        className={`justify-between ${className ?? ''}`}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">
          {selected
            ? selected.name
            : (placeholder ??
              t('jargon.domainSelector.placeholder', 'Select domain...'))}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('jargon.domainSelector.title', 'Choose Domain')}
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t(
                'jargon.domainSelector.searchPlaceholder',
                'Search domains...'
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-64">
            {fetching && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('jargon.domainSelector.loading', 'Loading...')}
              </p>
            )}
            {!fetching && filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('jargon.domainSelector.noResults', 'No domains found.')}
              </p>
            )}
            {filtered.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleSelect(domain)}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                <span className="font-medium">{domain.name}</span>
                {domain.parentDomain && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ↳ {domain.parentDomain.name}
                  </span>
                )}
              </button>
            ))}
          </ScrollArea>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="w-full mt-1"
            >
              {t('jargon.domainSelector.clear', 'Clear selection')}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

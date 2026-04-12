/**
 * JargonManagementPage — Terms table sub-component.
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  JARGON_TERMS_QUERY,
  IMPORT_JARGON_TERMS_MUTATION,
} from '@/lib/graphql/jargon.queries';
import type {
  JargonDomain,
  JargonTerm,
  AddJargonTermInput,
} from '@/types/jargon.types';
import { JargonTermForm } from '@/components/jargon/JargonTermForm';

interface Props {
  domain: JargonDomain;
}

/**
 * Parse a CSV string into AddJargonTermInput rows.
 * Expected header: canonicalForm,phoneticHint,altForms,definitionShort,language
 * altForms is a pipe-separated list within the cell.
 */
function parseCsvToTerms(csv: string, domainId: string): AddJargonTermInput[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  // Skip header row
  return lines.slice(1).flatMap((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const [
      canonicalForm,
      phoneticHint,
      altFormsRaw,
      definitionShort,
      language,
    ] = cols;
    if (!canonicalForm) return [];
    return [
      {
        domainId,
        canonicalForm,
        phoneticHint: phoneticHint || undefined,
        altForms: altFormsRaw
          ? altFormsRaw.split('|').map((s) => s.trim())
          : [],
        definitionShort: definitionShort ?? '',
        language: language ?? 'en',
      },
    ];
  });
}

export function TermsPanel({ domain }: Props) {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [showTermForm, setShowTermForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvContent, setCsvContent] = useState('');

  const [{ data, fetching }, refetch] = useQuery<{ jargonTerms: JargonTerm[] }>(
    {
      query: JARGON_TERMS_QUERY,
      variables: { domainId: domain.id, search, limit: 50 },
    }
  );

  const [{ fetching: importing }, execImport] = useMutation(
    IMPORT_JARGON_TERMS_MUTATION
  );

  const terms = data?.jargonTerms ?? [];

  const handleTermSaved = useCallback(() => {
    setShowTermForm(false);
    refetch({ requestPolicy: 'network-only' });
  }, [refetch]);

  const handleImport = useCallback(async () => {
    if (!csvContent.trim()) return;
    const terms = parseCsvToTerms(csvContent, domain.id);
    if (terms.length === 0) return;
    await execImport({ domainId: domain.id, terms });
    setShowImport(false);
    setCsvContent('');
    refetch({ requestPolicy: 'network-only' });
  }, [domain.id, csvContent, execImport, refetch]);

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold">{domain.name}</h2>
        <Badge variant="secondary">
          {t('jargon.management.termCount', '{{count}} terms', {
            count: terms.length,
          })}
        </Badge>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 w-48"
            placeholder={t('jargon.management.searchTerms', 'Search terms...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
          <Upload className="h-4 w-4 mr-1" />
          {t('jargon.management.import', 'Import CSV')}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setShowTermForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('jargon.management.addTerm', 'Add Term')}
        </Button>
      </div>

      {fetching && <LoadingSpinner containerHeight="py-8" />}

      {!fetching && terms.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t('jargon.management.noTerms', 'No terms found.')}
        </p>
      )}

      {!fetching && terms.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('jargon.management.colTerm', 'Term')}</TableHead>
              <TableHead>
                {t('jargon.management.colDefinition', 'Definition')}
              </TableHead>
              <TableHead>
                {t('jargon.management.colAltForms', 'Alt Forms')}
              </TableHead>
              <TableHead>
                {t('jargon.management.colConfidence', 'Confidence')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">
                  <div>{term.canonicalForm}</div>
                  {term.phoneticHint && (
                    <div className="text-xs text-muted-foreground">
                      {term.phoneticHint}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {term.definitionShort}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {term.altForms.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(term.confidence * 100)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Term form dialog */}
      <Dialog
        open={showTermForm}
        onOpenChange={(open) => {
          if (!open) setShowTermForm(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('jargon.management.addTermTitle', 'Add Term')}
            </DialogTitle>
          </DialogHeader>
          <JargonTermForm
            domainId={domain.id}
            onSave={handleTermSaved}
            onCancel={() => setShowTermForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Import CSV dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('jargon.management.importTitle', 'Import Terms from CSV')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              'jargon.management.importDescription',
              'Paste CSV content. Expected columns: canonicalForm, phoneticHint, altForms (pipe-separated), definitionShort, language'
            )}
          </p>
          <textarea
            rows={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="canonicalForm,phoneticHint,altForms,definitionShort,language..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowImport(false);
                setCsvContent('');
              }}
            >
              {t('jargon.management.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !csvContent.trim()}
            >
              {importing
                ? t('jargon.management.importing', 'Importing...')
                : t('jargon.management.importButton', 'Import')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

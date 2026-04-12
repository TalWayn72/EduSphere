/**
 * JargonManagementPage — Domains sidebar sub-component.
 */
import React, { useState } from 'react';
import { useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CREATE_JARGON_DOMAIN_MUTATION,
  DELETE_JARGON_DOMAIN_MUTATION,
} from '@/lib/graphql/jargon.queries';
import type { JargonDomain } from '@/types/jargon.types';

interface Props {
  domains: JargonDomain[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefetch: () => void;
}

interface DomainFormState {
  name: string;
  description: string;
  language: string;
}

const BLANK: DomainFormState = { name: '', description: '', language: 'en' };

export function DomainsSidebar({
  domains,
  selectedId,
  onSelect,
  onRefetch,
}: Props) {
  const { t } = useTranslation('admin');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<DomainFormState>(BLANK);
  const [deleteTarget, setDeleteTarget] = useState<JargonDomain | null>(null);

  const [{ fetching: creating }, execCreate] = useMutation(
    CREATE_JARGON_DOMAIN_MUTATION
  );
  const [{ fetching: deleting }, execDelete] = useMutation(
    DELETE_JARGON_DOMAIN_MUTATION
  );

  async function handleCreate() {
    if (!form.name.trim()) return;
    await execCreate({ input: form });
    setShowCreate(false);
    setForm(BLANK);
    onRefetch();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await execDelete({ id: deleteTarget.id });
    setDeleteTarget(null);
    onRefetch();
  }

  // Group by parent
  const roots = domains.filter((d) => !d.parentDomain);
  const childrenOf = (parentId: string) =>
    domains.filter((d) => d.parentDomain?.id === parentId);

  function renderDomain(domain: JargonDomain, depth = 0) {
    const isSelected = domain.id === selectedId;
    const children = childrenOf(domain.id);
    return (
      <React.Fragment key={domain.id}>
        <div
          className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-accent text-foreground'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onSelect(domain.id)}
        >
          {children.length > 0 && (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 truncate">{domain.name}</span>
          <span className="text-xs text-muted-foreground">{domain.termCount}</span>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive hover:text-destructive/80"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(domain);
            }}
            aria-label={t('jargon.management.deleteDomain', 'Delete domain')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {children.map((child) => renderDomain(child, depth + 1))}
      </React.Fragment>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('jargon.management.domains', 'Domains')}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5">
        {roots.map((d) => renderDomain(d))}
        {domains.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            {t('jargon.management.noDomains', 'No domains yet.')}
          </p>
        )}
      </div>

      {/* Create domain dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('jargon.management.createDomainTitle', 'Create Domain')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="domain-name">
                {t('jargon.management.nameLabel', 'Name')}
              </Label>
              <Input
                id="domain-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="domain-desc">
                {t('jargon.management.descriptionLabel', 'Description')}
              </Label>
              <Input
                id="domain-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="domain-lang">
                {t('jargon.management.languageLabel', 'Language')}
              </Label>
              <Input
                id="domain-lang"
                value={form.language}
                onChange={(e) =>
                  setForm((f) => ({ ...f, language: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              {t('jargon.management.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating
                ? t('jargon.management.creating', 'Creating...')
                : t('jargon.management.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('jargon.management.deleteDomainTitle', 'Delete Domain')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              'jargon.management.deleteDomainConfirm',
              'Delete "{{name}}"? All terms will be removed.',
              { name: deleteTarget?.name ?? '' }
            )}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('jargon.management.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? t('jargon.management.deleting', 'Deleting...')
                : t('jargon.management.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * DomainConfirmationModal — Shows auto-detected domains for a lesson.
 * Allows instructors to confirm/deselect and add new domains.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'urql';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DETECT_LESSON_DOMAINS_QUERY,
  CONFIRM_LESSON_DOMAINS_MUTATION,
  CREATE_JARGON_DOMAIN_MUTATION,
} from '@/lib/graphql/jargon.queries';
import type {
  DetectLessonDomainsResult,
  ConfirmLessonDomainsResult,
} from '@/types/jargon.types';

const newDomainSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
});

type NewDomainForm = z.infer<typeof newDomainSchema>;

interface Props {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (domainIds: string[]) => void;
}

function confidenceBadgeVariant(
  confidence: number
): 'default' | 'secondary' | 'outline' {
  if (confidence >= 0.8) return 'default';
  if (confidence >= 0.5) return 'secondary';
  return 'outline';
}

export function DomainConfirmationModal({
  lessonId,
  isOpen,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation('admin');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewDomainForm, setShowNewDomainForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  const [{ data, fetching }] = useQuery<{
    detectLessonDomains: DetectLessonDomainsResult;
  }>({
    query: DETECT_LESSON_DOMAINS_QUERY,
    variables: { lessonId },
    pause: !mounted || !isOpen,
  });

  const [{ fetching: confirming }, execConfirm] = useMutation<{
    confirmLessonDomains: ConfirmLessonDomainsResult;
  }>(CONFIRM_LESSON_DOMAINS_MUTATION);

  const [{ fetching: creating }, execCreate] = useMutation(
    CREATE_JARGON_DOMAIN_MUTATION
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewDomainForm>({ resolver: zodResolver(newDomainSchema) });

  const detected = data?.detectLessonDomains?.domains ?? [];

  useEffect(() => {
    const allIds = new Set(detected.map((d) => d.domain.id));
    setSelectedIds(allIds);
  }, [detected.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleDomain(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    const ids = Array.from(selectedIds);
    await execConfirm({ lessonId, domainIds: ids });
    onConfirm(ids);
    onClose();
  }

  async function handleCreateDomain(values: NewDomainForm) {
    const result = await execCreate({
      input: { name: values.name, description: values.description, language: 'en' },
    });
    if (!result.error && result.data?.createJargonDomain) {
      const newId = result.data.createJargonDomain.id as string;
      setSelectedIds((prev) => new Set([...prev, newId]));
    }
    setShowNewDomainForm(false);
    reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('jargon.domainConfirmation.title', 'Confirm Lesson Domains')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-4">
          {t(
            'jargon.domainConfirmation.description',
            'The following professional domains were automatically detected. Select the ones that apply.'
          )}
        </p>

        {fetching && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('jargon.domainConfirmation.detecting', 'Detecting domains...')}
          </p>
        )}

        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {detected.map(({ domain, confidence, method }) => (
            <label
              key={domain.id}
              className="flex items-start gap-3 cursor-pointer rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <Checkbox
                checked={selectedIds.has(domain.id)}
                onCheckedChange={() => toggleDomain(domain.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{domain.name}</span>
                  <Badge variant={confidenceBadgeVariant(confidence)}>
                    {Math.round(confidence * 100)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">{method}</span>
                </div>
                {domain.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {domain.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        {showNewDomainForm ? (
          <form
            onSubmit={handleSubmit(handleCreateDomain)}
            className="border rounded-md p-3 space-y-3 mt-2"
          >
            <p className="text-sm font-medium">
              {t('jargon.domainConfirmation.newDomainTitle', 'Add New Domain')}
            </p>
            <div>
              <Label htmlFor="new-domain-name">
                {t('jargon.domainConfirmation.nameLabel', 'Name')}
              </Label>
              <Input id="new-domain-name" {...register('name')} className="mt-1" />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="new-domain-desc">
                {t('jargon.domainConfirmation.descriptionLabel', 'Description')}
              </Label>
              <Input
                id="new-domain-desc"
                {...register('description')}
                className="mt-1"
              />
              {errors.description && (
                <p className="text-xs text-destructive mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={creating}>
                {creating
                  ? t('jargon.domainConfirmation.creating', 'Creating...')
                  : t('jargon.domainConfirmation.create', 'Create')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewDomainForm(false);
                  reset();
                }}
              >
                {t('jargon.domainConfirmation.cancel', 'Cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setShowNewDomainForm(true)}
          >
            {t('jargon.domainConfirmation.addDomain', '+ Add new domain')}
          </Button>
        )}

        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('jargon.domainConfirmation.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || selectedIds.size === 0}
          >
            {confirming
              ? t('jargon.domainConfirmation.confirming', 'Confirming...')
              : t(
                  'jargon.domainConfirmation.confirm',
                  'Confirm {{count}} domain(s)',
                  { count: selectedIds.size }
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

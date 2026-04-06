/**
 * CitationEditModal — Dialog for editing a lesson citation's fields.
 *
 * Pre-populates form from the given LessonCitation, submits via
 * useCitationReview().updateCitation, then calls onSaved + onClose.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Pencil } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCitationReview } from '@/hooks/useCitationReview';
import type {
  LessonCitation,
  CitationMatchStatus,
} from '@/components/enriched-transcript/enriched-transcript.types';

// ── Zod schema ────────────────────────────────────────────────────────────────

const citationSchema = z.object({
  bookName: z.string().min(1),
  part: z.string().optional(),
  page: z.string().optional(),
  column: z.string().optional(),
  paragraph: z.string().optional(),
  sourceText: z.string().min(1),
  resolvedText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  matchStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'REJECTED', 'EDITED']),
});

type CitationFormValues = z.infer<typeof citationSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface CitationEditModalProps {
  open: boolean;
  citation: LessonCitation | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toFormValues(c: LessonCitation): CitationFormValues {
  return {
    bookName: c.bookName,
    part: c.part ?? '',
    page: c.page ?? '',
    column: c.column ?? '',
    paragraph: c.paragraph ?? '',
    sourceText: c.sourceText,
    resolvedText: c.resolvedText ?? '',
    confidence: c.confidence,
    matchStatus: c.matchStatus,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CitationEditModal({
  open,
  citation,
  onClose,
  onSaved,
}: CitationEditModalProps) {
  const { t } = useTranslation('content');
  const { updateCitation } = useCitationReview();
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CitationFormValues>({
    resolver: zodResolver(citationSchema),
    defaultValues: {
      bookName: '',
      part: '',
      page: '',
      column: '',
      paragraph: '',
      sourceText: '',
      resolvedText: '',
      confidence: 0.5,
      matchStatus: 'UNVERIFIED',
    },
  });

  // Sync form when citation changes
  useEffect(() => {
    if (open && citation) {
      reset(toFormValues(citation));
      setSaveError(null);
    }
  }, [open, citation, reset]);

  const confidenceValue = watch('confidence');

  const onSubmit = async (values: CitationFormValues) => {
    if (!citation) return;
    setSaveError(null);
    try {
      await updateCitation(citation.id, {
        bookName: values.bookName,
        part: values.part || undefined,
        page: values.page || undefined,
        column: values.column || undefined,
        paragraph: values.paragraph || undefined,
        sourceText: values.sourceText,
        resolvedText: values.resolvedText || undefined,
        confidence: values.confidence,
        matchStatus: values.matchStatus as CitationMatchStatus,
      });
      onSaved();
      onClose();
    } catch {
      setSaveError(t('citationEdit.saveError', 'Failed to save citation. Please try again.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            {t('citationEdit.title', 'Edit Citation')}
          </DialogTitle>
          <DialogDescription>
            {t('citationEdit.description', 'Update the citation details. Changes will be saved to the lesson.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Book Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-bookName">
              {t('citationEdit.bookName', 'Book Name')}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Input
              id="ce-bookName"
              {...register('bookName')}
              disabled={isSubmitting}
              dir="auto"
            />
            {errors.bookName && (
              <p className="text-xs text-destructive">
                {t('citationEdit.bookNameRequired', 'Book name is required')}
              </p>
            )}
          </div>

          {/* Part / Page / Column / Paragraph — 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-part">{t('citationEdit.part', 'Part / Section')}</Label>
              <Input id="ce-part" {...register('part')} disabled={isSubmitting} dir="auto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-page">{t('citationEdit.page', 'Page')}</Label>
              <Input id="ce-page" {...register('page')} disabled={isSubmitting} dir="auto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-column">{t('citationEdit.column', 'Column')}</Label>
              <Input id="ce-column" {...register('column')} disabled={isSubmitting} dir="auto" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-paragraph">{t('citationEdit.paragraph', 'Paragraph')}</Label>
              <Input id="ce-paragraph" {...register('paragraph')} disabled={isSubmitting} dir="auto" />
            </div>
          </div>

          {/* Source Text */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-sourceText">
              {t('citationEdit.sourceText', 'Source Text')}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Textarea id="ce-sourceText" {...register('sourceText')} rows={3}
              disabled={isSubmitting} className="resize-none" dir="auto"
              placeholder={t('citationEdit.sourceTextHint', 'The quoted text as it appears in the source')}
            />
            {errors.sourceText && (
              <p className="text-xs text-destructive">
                {t('citationEdit.sourceTextRequired', 'Source text is required')}
              </p>
            )}
          </div>

          {/* Resolved Text */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-resolvedText">{t('citationEdit.resolvedText', 'Resolved Text')}</Label>
            <Textarea id="ce-resolvedText" {...register('resolvedText')} rows={3}
              disabled={isSubmitting} className="resize-none" dir="auto"
              placeholder={t('citationEdit.resolvedTextHint', 'The matching passage from the knowledge graph')}
            />
          </div>

          {/* Confidence slider */}
          <div className="space-y-2">
            <Label>
              {t('citationEdit.confidence', 'Confidence')}
              <span className="ms-2 text-muted-foreground text-xs">
                {Math.round(confidenceValue * 100)}%
              </span>
            </Label>
            <Controller
              name="confidence"
              control={control}
              render={({ field }) => (
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                  disabled={isSubmitting}
                  aria-label={t('citationEdit.confidence', 'Confidence')}
                />
              )}
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1.5">
            <Label>{t('citationEdit.status', 'Status')}</Label>
            <Controller
              name="matchStatus"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERIFIED">{t('citationEdit.statusVerified', 'Verified')}</SelectItem>
                    <SelectItem value="UNVERIFIED">{t('citationEdit.statusUnverified', 'Unverified')}</SelectItem>
                    <SelectItem value="REJECTED">{t('citationEdit.statusRejected', 'Rejected')}</SelectItem>
                    <SelectItem value="EDITED">{t('citationEdit.statusEdited', 'Edited')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {saveError && (
            <p role="alert" className="text-xs text-destructive">
              {saveError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('citationEdit.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isSubmitting
                ? t('citationEdit.saving', 'Saving...')
                : t('citationEdit.save', 'Save Changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

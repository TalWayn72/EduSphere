/**
 * BadgeAutoAwardEditor — Dynamic form for auto-award criteria (F-12).
 *
 * Dropdown: criteria type (COURSE_COMPLETE, XP_THRESHOLD, STREAK_DAYS, QUIZ_SCORE)
 * Dynamic fields per type (courseId picker, amount input, days input, score input).
 * Outputs JSON for auto_award_criteria field.
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type CriteriaType =
  | 'COURSE_COMPLETE'
  | 'XP_THRESHOLD'
  | 'STREAK_DAYS'
  | 'QUIZ_SCORE';

export interface AutoAwardCriteria {
  type: CriteriaType;
  courseId?: string;
  amount?: number;
  count?: number;
  minScore?: number;
}

interface BadgeAutoAwardEditorProps {
  value: AutoAwardCriteria | null;
  onChange: (criteria: AutoAwardCriteria | null) => void;
  t: (key: string) => string;
}

const CRITERIA_TYPES: CriteriaType[] = [
  'COURSE_COMPLETE',
  'XP_THRESHOLD',
  'STREAK_DAYS',
  'QUIZ_SCORE',
];

export function BadgeAutoAwardEditor({
  value,
  onChange,
  t,
}: BadgeAutoAwardEditorProps) {
  const handleTypeChange = (type: string) => {
    if (type === 'none') {
      onChange(null);
      return;
    }
    onChange({ type: type as CriteriaType });
  };

  const handleFieldChange = (field: string, rawValue: string) => {
    if (!value) return;
    const numValue = Number(rawValue);
    onChange({
      ...value,
      [field]: field === 'courseId' ? rawValue : numValue,
    });
  };

  return (
    <div className="space-y-3" data-testid="auto-award-editor">
      <Label>{t('gamification.autoAwardCriteria')}</Label>
      <Select
        value={value?.type ?? 'none'}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('gamification.selectCriteriaType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('gamification.noCriteria')}</SelectItem>
          {CRITERIA_TYPES.map((ct) => (
            <SelectItem key={ct} value={ct}>
              {t(`gamification.criteria.${ct}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value?.type === 'COURSE_COMPLETE' && (
        <div className="space-y-1">
          <Label htmlFor="criteria-courseId">
            {t('gamification.criteriaFields.courseId')}
          </Label>
          <Input
            id="criteria-courseId"
            value={value.courseId ?? ''}
            onChange={(e) => handleFieldChange('courseId', e.target.value)}
            placeholder={t('gamification.criteriaFields.courseIdPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('gamification.criteriaFields.courseIdHelp')}
          </p>
        </div>
      )}

      {value?.type === 'XP_THRESHOLD' && (
        <div className="space-y-1">
          <Label htmlFor="criteria-amount">
            {t('gamification.criteriaFields.xpAmount')}
          </Label>
          <Input
            id="criteria-amount"
            type="number"
            min={0}
            value={value.amount ?? ''}
            onChange={(e) => handleFieldChange('amount', e.target.value)}
            placeholder="100"
          />
        </div>
      )}

      {value?.type === 'STREAK_DAYS' && (
        <div className="space-y-1">
          <Label htmlFor="criteria-count">
            {t('gamification.criteriaFields.streakDays')}
          </Label>
          <Input
            id="criteria-count"
            type="number"
            min={1}
            value={value.count ?? ''}
            onChange={(e) => handleFieldChange('count', e.target.value)}
            placeholder="7"
          />
        </div>
      )}

      {value?.type === 'QUIZ_SCORE' && (
        <div className="space-y-1">
          <Label htmlFor="criteria-minScore">
            {t('gamification.criteriaFields.minScore')}
          </Label>
          <Input
            id="criteria-minScore"
            type="number"
            min={0}
            max={100}
            value={value.minScore ?? ''}
            onChange={(e) => handleFieldChange('minScore', e.target.value)}
            placeholder="80"
          />
        </div>
      )}
    </div>
  );
}

/**
 * BadgeFormFields — Reusable inline form for creating/editing badges.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface BadgeFormData {
  name: string;
  description: string;
  iconEmoji: string;
  category: string;
  pointsReward: number;
  conditionType: string;
  conditionValue: number;
}

interface BadgeFormFieldsProps {
  value: BadgeFormData;
  onChange: (v: BadgeFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export function BadgeFormFields({ value, onChange, onSave, onCancel, saving, saveLabel = 'Save' }: BadgeFormFieldsProps) {
  const set = <K extends keyof BadgeFormData>(k: K, v: BadgeFormData[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/40 rounded-lg">
      <Input placeholder="Name" value={value.name} onChange={(e) => set('name', e.target.value)} />
      <Input placeholder="Description" value={value.description} onChange={(e) => set('description', e.target.value)} />
      <Input placeholder="Icon Emoji (e.g. 🏆)" value={value.iconEmoji} onChange={(e) => set('iconEmoji', e.target.value)} />
      <Input placeholder="Category" value={value.category} onChange={(e) => set('category', e.target.value)} />
      <Input
        type="number"
        placeholder="Points Reward"
        value={value.pointsReward}
        onChange={(e) => set('pointsReward', Number(e.target.value))}
      />
      <Input placeholder="Condition Type (e.g. courses_completed)" value={value.conditionType} onChange={(e) => set('conditionType', e.target.value)} />
      <Input
        type="number"
        placeholder="Condition Value"
        value={value.conditionValue}
        onChange={(e) => set('conditionValue', Number(e.target.value))}
      />
      <div className="flex gap-2 items-center col-span-2 md:col-span-2">
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : saveLabel}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DIFFICULTY_OPTIONS,
  THUMBNAIL_OPTIONS,
  type CourseFormData,
  type Difficulty,
} from './course-create.types';

interface Props {
  data: CourseFormData;
  onChange: (updates: Partial<CourseFormData>) => void;
}

export function CourseWizardStep1({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Course Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Introduction to Talmud Study"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={!data.title ? 'border-destructive' : ''}
        />
        {!data.title && (
          <p className="text-xs text-destructive">Title is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What will students learn in this course?"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Difficulty Level</Label>
          <Select
            value={data.difficulty}
            onValueChange={(v) => onChange({ difficulty: v as Difficulty })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input
            id="duration"
            placeholder="e.g. 6 weeks"
            value={data.duration}
            onChange={(e) => onChange({ duration: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thumbnail Icon</Label>
        <div className="flex flex-wrap gap-2">
          {THUMBNAIL_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ thumbnail: emoji })}
              className={`text-3xl p-2 rounded-lg border-2 transition-colors ${
                data.thumbnail === emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:border-muted-foreground'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

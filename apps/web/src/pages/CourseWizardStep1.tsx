import React from 'react';
import { type Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { type CourseSchemaValues } from './CourseCreatePage';
import { DIFFICULTY_OPTIONS, THUMBNAIL_OPTIONS } from './course-create.types';

interface Props {
  control: Control<CourseSchemaValues>;
}

export function CourseWizardStep1({ control }: Props) {
  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Course Title *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Introduction to Talmud Study" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="What will students learn in this course?"
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 6 weeks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="thumbnail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Thumbnail Icon</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {THUMBNAIL_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => field.onChange(emoji)}
                    className={`text-3xl p-2 rounded-lg border-2 transition-colors ${
                      field.value === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

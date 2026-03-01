import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'wizard.courseTitleLabel': 'Course Title',
        'wizard.courseTitlePlaceholder': 'Enter course title',
        'wizard.descriptionLabel': 'Description',
        'wizard.courseDescriptionPlaceholder': 'Describe the course',
        'wizard.difficultyLabel': 'Difficulty',
        'wizard.durationLabel': 'Duration',
        'wizard.durationPlaceholder': 'e.g. 4 weeks',
        'wizard.thumbnailLabel': 'Thumbnail',
      };
      return map[key] ?? (opts ? `${key}(${JSON.stringify(opts)})` : key);
    },
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseWizardStep1 } from './CourseWizardStep1';
import type { CourseSchemaValues } from './CourseCreatePage';

// ── Helpers ───────────────────────────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.string(),
  thumbnail: z.string(),
});

function Step1Wrapper({ defaultValues }: { defaultValues?: Partial<CourseSchemaValues> }) {
  const form = useForm<CourseSchemaValues>({
    resolver: zodResolver(courseSchema as never),
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'BEGINNER',
      duration: '',
      thumbnail: '📚',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form>
        <CourseWizardStep1 control={form.control} />
      </form>
    </Form>
  );
}

function renderStep1(defaultValues?: Partial<CourseSchemaValues>) {
  return render(<Step1Wrapper defaultValues={defaultValues} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseWizardStep1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Course Title field label', () => {
    renderStep1();
    expect(screen.getByText('Course Title')).toBeInTheDocument();
  });

  it('renders the Description field label', () => {
    renderStep1();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders the Difficulty field label', () => {
    renderStep1();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
  });

  it('renders the Duration field label', () => {
    renderStep1();
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('renders the Thumbnail field label', () => {
    renderStep1();
    expect(screen.getByText('Thumbnail')).toBeInTheDocument();
  });

  it('title input accepts text input', () => {
    renderStep1();
    const titleInput = screen.getByPlaceholderText('Enter course title');
    fireEvent.change(titleInput, { target: { value: 'My New Course' } });
    expect(titleInput).toHaveValue('My New Course');
  });

  it('description textarea accepts text input', () => {
    renderStep1();
    const descInput = screen.getByPlaceholderText('Describe the course');
    fireEvent.change(descInput, { target: { value: 'A great course.' } });
    expect(descInput).toHaveValue('A great course.');
  });

  it('renders thumbnail emoji buttons', () => {
    renderStep1();
    // At least a few thumbnail options should be rendered as buttons
    const emojiButtons = screen.getAllByRole('button');
    expect(emojiButtons.length).toBeGreaterThan(0);
  });

  it('the default thumbnail emoji button has the primary border class', () => {
    renderStep1({ thumbnail: '📚' });
    // The selected thumbnail button has border-primary class
    const bookBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent?.trim() === '📚'
    );
    expect(bookBtn).toBeDefined();
    expect(bookBtn?.className).toContain('border-primary');
  });

  it('duration input has placeholder text', () => {
    renderStep1();
    expect(screen.getByPlaceholderText('e.g. 4 weeks')).toBeInTheDocument();
  });
});

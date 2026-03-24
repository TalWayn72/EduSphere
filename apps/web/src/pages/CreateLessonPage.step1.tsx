import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { LessonFormData } from './CreateLessonPage';

interface Props {
  initialData: LessonFormData;
  onSubmit: (data: LessonFormData) => void;
}

export function CreateLessonStep1({ initialData, onSubmit }: Props) {
  const { t } = useTranslation('courses');

  const Step1Schema = z.object({
    title: z.string().min(3, t('createLesson.titleMinLength')),
    type: z.enum(['THEMATIC', 'SEQUENTIAL']),
    lessonDate: z.string().optional().default(''),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(Step1Schema),
    defaultValues: initialData as z.input<typeof Step1Schema>,
  });

  const selectedType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-xl font-semibold mb-4">{t('createLesson.step1Title')}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('createLesson.lessonTitleLabel')}
          </label>
          <input
            {...register('title')}
            placeholder={t('createLesson.lessonTitlePlaceholder')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1 dark:text-red-400">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('createLesson.lessonType')}</label>
          <div className="flex gap-3">
            {(['THEMATIC', 'SEQUENTIAL'] as const).map((lessonType) => (
              <label key={lessonType} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={lessonType}
                  checked={selectedType === lessonType}
                  onChange={() => setValue('type', lessonType)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {lessonType === 'THEMATIC'
                    ? t('createLesson.typeThematic')
                    : t('createLesson.typeSequential')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('createLesson.lessonDate')}</label>
          <input
            type="date"
            {...register('lessonDate')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Button type="submit" className="mt-6 w-full">
        {t('createLesson.continueToMaterials')}
      </Button>
    </form>
  );
}

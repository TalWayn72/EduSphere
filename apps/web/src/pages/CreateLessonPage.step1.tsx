import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import type { LessonFormData } from './CreateLessonPage';

const Step1Schema = z.object({
  title: z.string().min(3, 'כותרת חייבת להכיל לפחות 3 תווים'),
  type: z.enum(['THEMATIC', 'SEQUENTIAL']),
  series: z.string().optional().default(''),
  lessonDate: z.string().optional().default(''),
});

interface Props {
  initialData: LessonFormData;
  onSubmit: (data: LessonFormData) => void;
}

export function CreateLessonStep1({ initialData, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LessonFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(Step1Schema as any),
    defaultValues: initialData,
  });

  const selectedType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-xl font-semibold mb-4">פרטי שיעור</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            כותרת השיעור *
          </label>
          <input
            {...register('title')}
            placeholder="לדוג׳: שיעור עץ חיים — שער הנסירה פסקה ג׳"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">סוג שיעור *</label>
          <div className="flex gap-3">
            {(['THEMATIC', 'SEQUENTIAL'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={t}
                  checked={selectedType === t}
                  onChange={() => setValue('type', t)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {t === 'THEMATIC' ? 'הגות (נושאי)' : 'על הסדר'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">סדרת שיעורים</label>
          <input
            {...register('series')}
            placeholder="לדוג׳: ספר עץ חיים — שנת תשפ״ה"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">תאריך שיעור</label>
          <input
            type="date"
            {...register('lessonDate')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Button type="submit" className="mt-6 w-full">
        המשך לחומרים ←
      </Button>
    </form>
  );
}

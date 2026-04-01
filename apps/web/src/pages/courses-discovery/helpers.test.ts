import { describe, it, expect } from 'vitest';
import { toDisplayCourse } from './helpers';

describe('toDisplayCourse', () => {
  it('maps API course to display course', () => {
    const result = toDisplayCourse({
      id: 'c-1',
      title: 'Test Course',
      description: 'desc',
      thumbnailUrl: null,
      estimatedHours: 5,
      isPublished: true,
      instructorId: 'u-abc123',
    });
    expect(result.id).toBe('c-1');
    expect(result.title).toBe('Test Course');
    expect(result.level).toBe('Intermediate');
  });

  it('returns Beginner for short courses', () => {
    const result = toDisplayCourse({
      id: 'c-2',
      title: 'Short',
      description: '',
      thumbnailUrl: null,
      estimatedHours: 2,
      isPublished: true,
      instructorId: 'u-xyz999',
    });
    expect(result.level).toBe('Beginner');
  });

  it('returns Advanced for long courses', () => {
    const result = toDisplayCourse({
      id: 'c-3',
      title: 'Long',
      description: '',
      thumbnailUrl: null,
      estimatedHours: 15,
      isPublished: true,
      instructorId: 'u-xyz999',
    });
    expect(result.level).toBe('Advanced');
  });

  it('handles null estimatedHours as Beginner', () => {
    const result = toDisplayCourse({
      id: 'c-4',
      title: 'Null Hours',
      description: '',
      thumbnailUrl: null,
      estimatedHours: null,
      isPublished: true,
      instructorId: 'u-xyz999',
    });
    expect(result.level).toBe('Beginner');
    expect(result.estimatedHours).toBe(0);
  });
});

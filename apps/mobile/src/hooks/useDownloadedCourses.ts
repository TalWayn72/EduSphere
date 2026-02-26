/**
 * useDownloadedCourses — lists downloaded courses with size info.
 * Memory-safe: no intervals, pure async load.
 */
import { useState, useEffect, useCallback } from 'react';
import { downloadService, type OfflineCourse } from '../services/downloads';

interface UseDownloadedCoursesReturn {
  courses: OfflineCourse[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

export function useDownloadedCourses(): UseDownloadedCoursesReturn {
  const [courses, setCourses] = useState<OfflineCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const list = await downloadService.getOfflineCourses();
    setCourses(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const deleteCourse = useCallback(
    async (id: string) => {
      await downloadService.deleteCourse(id);
      await refresh();
    },
    [refresh]
  );

  return { courses, isLoading, refresh, deleteCourse };
}

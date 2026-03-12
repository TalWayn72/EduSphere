import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — EduSphere` : 'EduSphere — AI-Native LMS';
    return () => {
      document.title = prev;
    };
  }, [title]);
}

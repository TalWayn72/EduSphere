/**
 * SkillPathPage — grid of skill paths with per-path progress.
 * Route: /skills
 * Access: all authenticated users
 */
import { useState, useEffect } from 'react';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';
import { SKILL_PATHS_QUERY, MY_SKILL_PROGRESS_QUERY } from '@/lib/graphql/skills.queries';
import { SkillPathCard } from '@/components/skills/SkillPathCard';

interface SkillPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  skillIds: string[];
  estimatedHours: number;
  isPublished: boolean;
}

interface LearnerSkillProgress {
  skillId: string;
  masteryLevel: string;
  evidenceCount: number;
  lastActivityAt: string | null;
}

interface SkillPathsResult {
  skillPaths: SkillPath[];
}

interface MySkillProgressResult {
  mySkillProgress: LearnerSkillProgress[];
}

export function SkillPathPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data: pathsData, fetching: pathsFetching, error: pathsError }] =
    useQuery<SkillPathsResult>({
      query: SKILL_PATHS_QUERY,
      pause: !mounted,
    });

  const [{ data: progressData }] = useQuery<MySkillProgressResult>({
    query: MY_SKILL_PROGRESS_QUERY,
    pause: !mounted,
  });

  const paths = pathsData?.skillPaths ?? [];
  const progress = progressData?.mySkillProgress ?? [];
  const publishedPaths = paths.filter((p) => p.isPublished);

  const isLoading = !mounted || pathsFetching;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">Skill Paths</h1>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-busy="true"
            aria-label="Loading skill paths"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && pathsError && (
          <p className="text-destructive text-sm">
            Failed to load skill paths. Please try again.
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !pathsError && publishedPaths.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Target className="h-10 w-10 text-muted-foreground/40" aria-hidden />
            <p className="text-muted-foreground">No skill paths available yet.</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && publishedPaths.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedPaths.map((path) => (
              <SkillPathCard key={path.id} path={path} progress={progress} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

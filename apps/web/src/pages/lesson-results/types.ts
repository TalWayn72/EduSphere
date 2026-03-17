// ── Types & helpers for Lesson Results ───────────────────────────────────────

export interface PipelineResult {
  id: string;
  moduleName: string;
  outputType: string;
  outputData: Record<string, unknown> | null;
  fileUrl?: string | null;
}

export interface LessonAsset {
  id: string;
  assetType: string;
  sourceUrl?: string | null;
  fileUrl?: string | null;
}

export interface LessonQueryData {
  lesson: {
    id: string;
    title: string;
    status: string;
    assets: LessonAsset[];
    pipeline?: {
      id: string;
      currentRun?: {
        id: string;
        status: string;
        startedAt?: string | null;
        completedAt?: string | null;
        results: PipelineResult[];
      } | null;
    } | null;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getResult(results: PipelineResult[], moduleName: string) {
  return results.find(
    (r) => r.moduleName === moduleName || r.moduleName === moduleName.toLowerCase()
  );
}

export function getString(data: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!data) return null;
  const v = data[key];
  return v != null && v !== '' ? String(v) : null;
}

export function getArray<T>(data: Record<string, unknown> | null | undefined, key: string): T[] | null {
  if (!data) return null;
  const v = data[key];
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : null;
}

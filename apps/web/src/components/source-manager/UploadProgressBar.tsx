/**
 * UploadProgressBar — displays a combined progress indicator for the two-phase
 * file upload flow used in AddSourceModal:
 *
 *  Phase 1 (isReading): reading / encoding the file locally (FileReader)
 *  Phase 2 (isUploading): sending bytes over the network (XHR)
 *
 * Shows:
 *  - Animated progress bar (shadcn/ui Progress)
 *  - Human-readable percentage
 *  - File size info (transferred / total during upload)
 *  - Phase label ("Reading file…" / "Uploading…")
 */
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UploadProgressBarProps {
  /** True while the FileReader is encoding the file as base64 */
  isReading: boolean;
  /** FileReader progress 0–100 */
  readProgress: number;
  /** True while the XHR PUT is in-flight */
  isUploading: boolean;
  /** XHR upload progress 0–100 */
  uploadProgress: number;
  /** Total size of the file being uploaded (bytes) — shown as "X of Y" */
  fileSize?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadProgressBar({
  isReading,
  readProgress,
  isUploading,
  uploadProgress,
  fileSize,
}: UploadProgressBarProps) {
  const { t } = useTranslation('content');

  const isActive = isReading || isUploading;
  if (!isActive) return null;

  const progress = isReading ? readProgress : uploadProgress;
  const label = isReading
    ? t('sources.readingFile', { progress: readProgress })
    : t('sources.uploadingFile', { progress: uploadProgress });

  const transferredBytes =
    isUploading && fileSize !== undefined
      ? Math.round((uploadProgress / 100) * fileSize)
      : null;

  return (
    <div
      className="mt-1 space-y-1"
      data-testid="upload-progress-bar"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span data-testid="upload-progress-label">{label}</span>
        <span data-testid="upload-progress-pct" aria-label={`${progress}%`}>
          {progress}%
        </span>
      </div>

      <Progress
        value={progress}
        className="h-2"
        data-testid="upload-progress-track"
        aria-label={label}
      />

      {isUploading && transferredBytes !== null && fileSize !== undefined && (
        <p
          className="text-xs text-gray-400 dark:text-gray-500"
          data-testid="upload-progress-bytes"
        >
          {formatBytes(transferredBytes)} / {formatBytes(fileSize)}
        </p>
      )}
    </div>
  );
}

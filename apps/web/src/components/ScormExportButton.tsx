/**
 * ScormExportButton — triggers SCORM 2004 export for a course.
 * Calls the exportCourseAsScorm mutation and opens the presigned
 * download URL in a new tab on success.
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EXPORT_COURSE_AS_SCORM_MUTATION } from '@/lib/graphql/scorm.queries';

interface ScormExportButtonProps {
  courseId: string;
  courseTitle: string;
}

interface ExportMutationData {
  exportCourseAsScorm: string;
}

export function ScormExportButton({ courseId, courseTitle }: ScormExportButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [, exportScorm] = useMutation<ExportMutationData>(EXPORT_COURSE_AS_SCORM_MUTATION);

  const handleExport = async () => {
    setError(null);
    const result = await exportScorm({ courseId });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const presignedUrl = result.data?.exportCourseAsScorm;
    if (presignedUrl) {
      window.open(presignedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleClick = () => {
    setExporting(true);
    void handleExport().finally(() => setExporting(false));
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={exporting}
        aria-label={`Export ${courseTitle} as SCORM 2004`}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exporting ? 'Exporting...' : 'Export as SCORM 2004'}
      </Button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}

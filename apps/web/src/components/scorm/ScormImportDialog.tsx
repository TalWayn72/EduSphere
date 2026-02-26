/**
 * ScormImportDialog — allows instructors to upload a SCORM ZIP package.
 *
 * Flow:
 * 1. User picks a .zip file
 * 2. File is uploaded via presigned URL (existing MediaService)
 * 3. importScormPackage mutation is called with the fileKey
 * 4. On success, callback is invoked with the new courseId
 */
import { useState, useRef } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Upload, CheckCircle, AlertCircle } from 'lucide-react';

const IMPORT_SCORM = `
  mutation ImportScormPackage($fileKey: String!) {
    importScormPackage(fileKey: $fileKey) {
      courseId
      itemCount
    }
  }
`;

interface ScormImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (courseId: string) => void;
  presignedUploadUrl: (
    fileName: string
  ) => Promise<{ uploadUrl: string; fileKey: string }>;
}

type ImportState = 'idle' | 'uploading' | 'importing' | 'done' | 'error';

export function ScormImportDialog({
  open,
  onOpenChange,
  onSuccess,
  presignedUploadUrl,
}: ScormImportDialogProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, importPackage] = useMutation<
    { importScormPackage: { courseId: string; itemCount: number } },
    { fileKey: string }
  >(IMPORT_SCORM);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setErrorMsg('Please select a .zip file');
      setState('error');
      return;
    }

    setState('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      // 1. Get presigned URL
      const { uploadUrl, fileKey } = await presignedUploadUrl(file.name);

      // 2. Upload via XHR to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'application/zip');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable)
            setProgress(Math.round((ev.loaded / ev.total) * 90));
        };
        xhr.onload = () =>
          xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(file);
      });

      setProgress(95);
      setState('importing');

      // 3. Trigger SCORM import mutation
      const result = await importPackage({ fileKey });
      if (result.error) throw new Error(result.error.message);

      const courseId = result.data?.importScormPackage.courseId ?? '';
      setProgress(100);
      setState('done');
      setTimeout(() => onSuccess(courseId), 800);
    } catch (err) {
      setErrorMsg(String(err));
      setState('error');
    }
  };

  const handleClose = () => {
    setState('idle');
    setProgress(0);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import SCORM Package</DialogTitle>
          <DialogDescription>
            Upload a SCORM 1.2 or 2004 ZIP package to create a new course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {state === 'idle' && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select a .zip SCORM package
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {(state === 'uploading' || state === 'importing') && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">
                  {state === 'uploading'
                    ? `Uploading... ${progress}%`
                    : 'Importing SCORM package...'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-2 bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {state === 'done' && (
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Import successful! Redirecting...
              </span>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{errorMsg}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setState('idle');
                  fileRef.current?.click();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={state === 'uploading' || state === 'importing'}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

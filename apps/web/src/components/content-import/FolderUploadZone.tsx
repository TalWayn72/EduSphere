import { useRef, useState, useCallback } from 'react';
import { Upload, FolderOpen } from 'lucide-react';

interface UploadedFile {
  file: File;
  relativePath: string;
}

interface Props {
  courseId: string;
  onFilesSelected?: (files: UploadedFile[]) => void;
}

const SUPPORTED_EXTENSIONS = new Set([
  'mp4', 'mov', 'webm', 'pdf', 'pptx', 'docx', 'md', 'txt', 'zip',
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic',
]);

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

// Detect iOS Safari — webkitdirectory not supported
const isIosSafari =
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !('MSStream' in window);

export function FolderUploadZone({ courseId: _courseId, onFilesSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sizeWarning, setSizeWarning] = useState('');

  const processFiles = useCallback((rawFiles: FileList) => {
    const valid: UploadedFile[] = [];
    let totalSize = 0;

    for (const file of Array.from(rawFiles)) {
      const ext = getExtension(file.name);
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
      totalSize += file.size;
      valid.push({
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      });
    }

    // Sort by numeric prefix for auto-ordering: 01_, 02_, etc.
    valid.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));

    // Warn if > 500MB
    if (totalSize > 500 * 1024 * 1024) {
      setSizeWarning(`Total size: ${Math.round(totalSize / 1024 / 1024)}MB — large uploads may take a while.`);
    } else {
      setSizeWarning('');
    }

    setFiles(valid);
    onFilesSelected?.(valid);
  }, [onFilesSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  if (isIosSafari) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        <Upload className="mx-auto mb-2 h-8 w-8" />
        <p>Folder upload is not supported on iOS Safari.</p>
        <p className="mt-1">Please use the desktop app or select individual files.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload folder or ZIP archive"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">Drop a folder or ZIP here</p>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse — MP4, PDF, PPTX, DOCX, images, ZIP
        </p>
        <input
          ref={inputRef}
          type="file"
          {...{ webkitdirectory: '' }}
          multiple
          onChange={handleChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          accept=".mp4,.mov,.pdf,.pptx,.docx,.md,.txt,.zip,.jpg,.jpeg,.png,.webp,.gif,.heic"
        />
      </div>

      {sizeWarning && (
        <p className="mt-2 text-sm text-yellow-600" role="status">{sizeWarning}</p>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">{files.length} file(s) selected:</p>
          <ul className="max-h-48 overflow-y-auto rounded border text-xs divide-y">
            {files.map(({ relativePath, file }) => (
              <li key={relativePath} className="flex justify-between px-3 py-1.5">
                <span className="font-mono truncate">{relativePath}</span>
                <span className="text-muted-foreground ml-4 shrink-0">
                  {Math.round(file.size / 1024)}KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

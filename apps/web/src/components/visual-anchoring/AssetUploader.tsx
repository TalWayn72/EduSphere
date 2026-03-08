/**
 * AssetUploader — drag-and-drop + file input for uploading visual assets.
 * Flow: presigned URL → PUT to MinIO → confirmVisualAssetUpload mutation.
 * Shows scan-status feedback at each stage.
 */
import React, { useState, useRef, useCallback, DragEvent } from 'react';
import { useMutation, useClient } from 'urql';
import { Upload, CheckCircle, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONFIRM_VISUAL_ASSET_UPLOAD, GET_PRESIGNED_UPLOAD_URL } from './visual-anchor.graphql';
import type { UploadStatus, VisualAsset } from './visual-anchor.types';

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES =
  'image/png,image/jpeg,image/gif,image/svg+xml,image/tiff,image/bmp,image/webp';

interface AssetUploaderProps {
  courseId: string;
  onUploaded: (asset: VisualAsset) => void;
}

export default function AssetUploader({ courseId, onUploaded }: AssetUploaderProps) {
  const client = useClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, confirmUpload] = useMutation(CONFIRM_VISUAL_ASSET_UPLOAD);

  const uploadFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      if (file.size > MAX_FILE_BYTES) {
        setErrorMessage('File exceeds 15 MB limit. Please choose a smaller file.');
        setStatus('error');
        return;
      }

      setStatus('uploading');

      // Step 1: get presigned URL
      const presignedResult = await client.query(GET_PRESIGNED_UPLOAD_URL, {
        fileName: file.name,
        contentType: file.type,
        courseId,
      });

      if (presignedResult.error || !presignedResult.data?.getPresignedUploadUrl) {
        setErrorMessage('Could not initiate upload. Please try again.');
        setStatus('error');
        return;
      }

      const { uploadUrl, fileKey } = presignedResult.data.getPresignedUploadUrl as {
        uploadUrl: string;
        fileKey: string;
        expiresAt: string;
      };

      // Step 2: PUT file to MinIO
      try {
        const putResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!putResponse.ok) {
          setErrorMessage('Upload failed. Please try again.');
          setStatus('error');
          return;
        }
      } catch {
        setErrorMessage('Upload failed. Check your connection and try again.');
        setStatus('error');
        return;
      }

      // Step 3: confirm upload → triggers server-side AV scan
      setStatus('scanning');
      const confirmResult = await confirmUpload({
        fileKey,
        courseId,
        originalName: file.name,
        declaredMimeType: file.type,
        declaredSize: file.size,
      });

      if (confirmResult.error || !confirmResult.data?.confirmVisualAssetUpload) {
        setErrorMessage('Upload confirmation failed. Please try again.');
        setStatus('error');
        return;
      }

      const asset = confirmResult.data.confirmVisualAssetUpload as VisualAsset;

      if (asset.scanStatus === 'INFECTED') {
        setStatus('infected');
        setErrorMessage('File flagged by security scan and was rejected.');
        return;
      }

      setStatus('success');
      onUploaded(asset);
    },
    [client, courseId, confirmUpload, onUploaded],
  );

  const handleFiles = useCallback(
    (files: HTMLInputElement['files']) => {
      const file = files?.[0];
      if (!file) return;
      void uploadFile(file);
    },
    [uploadFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files as HTMLInputElement['files']);
    },
    [handleFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be re-selected after an error
      e.target.value = '';
    },
    [handleFiles],
  );

  const handleReset = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <div data-testid="asset-uploader" className="w-full">
      {status === 'idle' && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload image"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
            'cursor-pointer px-6 py-8 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-foreground',
          ].join(' ')}
        >
          <Upload className="h-8 w-8" />
          <p className="text-sm font-medium">Drop an image here or click to browse</p>
          <p className="text-xs">PNG, JPG, GIF, SVG, TIFF, BMP, WebP — max 15 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="sr-only"
            onChange={handleInputChange}
            data-testid="asset-file-input"
          />
        </div>
      )}

      {(status === 'uploading' || status === 'scanning') && (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/40 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">
            {status === 'uploading' ? 'Uploading…' : 'Scanning for security…'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Image uploaded and ready to use.
          </p>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
            Upload another
          </Button>
        </div>
      )}

      {status === 'infected' && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
            Try another file
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

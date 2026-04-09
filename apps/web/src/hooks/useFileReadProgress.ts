/**
 * useFileReadProgress — reads a File as base64 while reporting progress.
 *
 * Uses FileReader.onprogress to track reading progress (0–100).
 * Uses mounted-guard pattern to prevent setState after unmount.
 */
import { useState, useRef, useEffect } from 'react';

export interface UseFileReadProgressResult {
  /** Read a File and return its base64-encoded content (without data URL prefix). */
  readFileAsBase64: (file: File) => Promise<string>;
  /** Reading progress 0–100. */
  progress: number;
  /** True while FileReader is actively reading. */
  isReading: boolean;
}

export function useFileReadProgress(): UseFileReadProgressResult {
  const [progress, setProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      if (mountedRef.current) {
        setProgress(0);
        setIsReading(true);
      }

      const reader = new FileReader();

      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        if (e.lengthComputable && mountedRef.current) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      reader.onload = () => {
        if (mountedRef.current) {
          setProgress(100);
          setIsReading(false);
        }
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1] ?? '');
      };

      reader.onerror = () => {
        if (mountedRef.current) {
          setIsReading(false);
          setProgress(0);
        }
        reject(reader.error);
      };

      reader.readAsDataURL(file);
    });
  };

  return { readFileAsBase64, progress, isReading };
}

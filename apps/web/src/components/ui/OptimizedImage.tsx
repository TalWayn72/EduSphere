import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * OptimizedImage — wraps <img> with:
 * - loading="lazy" by default (prevents CLS)
 * - decoding="async" (non-blocking decode)
 * - WebP srcset for /uploads/ URLs (ImageKit URL transform)
 * - Explicit width/height to prevent layout shift (CLS)
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
}) => {
  // Generate WebP URL for /uploads/ paths
  const isUploadUrl =
    src.includes('/uploads/') ||
    src.includes('minio') ||
    src.includes('storage');
  const webpSrc = isUploadUrl ? `${src}?tr=f-webp,q-80` : undefined;

  if (webpSrc) {
    return (
      <picture>
        <source type="image/webp" srcSet={webpSrc} />
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          className={className}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      className={className}
    />
  );
};

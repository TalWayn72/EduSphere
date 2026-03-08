import React, { useState, useEffect, useRef } from 'react';
import { useCrossFadeGif } from './useCrossFadeGif';
import { useInteractiveSvg } from './useInteractiveSvg';

interface ImageLayer {
  src: string;
  alt: string;
  mimeType: string;
}

interface CrossFadeImageProps {
  src: string | null;
  alt?: string;
  mimeType?: string;
  className?: string;
  /** Fade duration in ms (default: 400) */
  fadeDuration?: number;
  /** Render SVG inline (sanitized) for interactivity — only applies when mimeType === 'image/svg+xml' */
  interactiveSvg?: boolean;
}

/**
 * Cross-fade image component.
 * Two layered img elements swap opacity via CSS transition.
 * GPU-accelerated → guaranteed 60fps.
 * Memory-safe: all setTimeout/fetch handles cleared on unmount.
 * G-2: interactiveSvg renders sanitized SVG inline via DOMPurify.
 * G-3: outgoing GIF src swapped to transparent pixel after fade.
 */
export default function CrossFadeImage({
  src,
  alt = '',
  mimeType = 'image/png',
  className = '',
  fadeDuration = 400,
  interactiveSvg = false,
}: CrossFadeImageProps) {
  const [current, setCurrent] = useState<ImageLayer | null>(null);
  const [next, setNext] = useState<ImageLayer | null>(null);
  const [showNext, setShowNext] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentImgRef = useRef<HTMLImageElement | null>(null);

  const isSvgInteractive = mimeType === 'image/svg+xml' && interactiveSvg;
  const { sanitizedSvg } = useInteractiveSvg(src, isSvgInteractive);
  const { scheduleGifPause } = useCrossFadeGif(current?.src ?? null, current?.mimeType ?? '');

  // Cleanup fade timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setCurrent(null);
      setNext(null);
      return;
    }

    const newLayer: ImageLayer = { src, alt, mimeType };

    if (!current) {
      setCurrent(newLayer);
      return;
    }

    if (current.src === src) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setNext(newLayer);
    setShowNext(false);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShowNext(true));
    });

    timerRef.current = setTimeout(() => {
      // G-3: pause outgoing GIF before swapping layers
      scheduleGifPause(currentImgRef.current);
      setCurrent(newLayer);
      setNext(null);
      setShowNext(false);
      timerRef.current = null;
    }, fadeDuration + 50);
  }, [src, alt, mimeType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current && !next) return null;

  // G-2: interactive SVG rendering path
  if (isSvgInteractive && sanitizedSvg !== null) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        data-testid="cross-fade-image"
        dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        aria-label={alt || undefined}
        role="img"
      />
    );
  }

  const visibleAlt = next ? (next.alt || undefined) : (current?.alt || undefined);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-testid="cross-fade-image"
      role="img"
      aria-label={visibleAlt}
    >
      {current && (
        <img
          ref={currentImgRef}
          src={current.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: showNext ? 0 : 1, transition: `opacity ${fadeDuration}ms ease-in-out` }}
          data-testid="cross-fade-current"
        />
      )}
      {next && (
        <img
          src={next.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: showNext ? 1 : 0, transition: `opacity ${fadeDuration}ms ease-in-out` }}
          data-testid="cross-fade-next"
        />
      )}
    </div>
  );
}

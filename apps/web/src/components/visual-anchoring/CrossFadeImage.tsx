import React, { useState, useEffect, useRef } from 'react';

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
}

/**
 * Cross-fade image component.
 * Two layered img elements swap opacity via CSS transition.
 * GPU-accelerated → guaranteed 60fps.
 * Memory-safe: setTimeout handle cleared on unmount.
 */
export default function CrossFadeImage({
  src,
  alt = '',
  mimeType = 'image/png',
  className = '',
  fadeDuration = 400,
}: CrossFadeImageProps) {
  // Two layers: "current" (visible) and "next" (fading in)
  const [current, setCurrent] = useState<ImageLayer | null>(null);
  const [next, setNext] = useState<ImageLayer | null>(null);
  const [showNext, setShowNext] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
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
      // First image: no fade needed
      setCurrent(newLayer);
      return;
    }

    if (current.src === src) return; // No change

    // Clear any in-flight transition timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Start cross-fade: set next image, trigger opacity transition
    setNext(newLayer);
    setShowNext(false);

    // Small delay to allow DOM paint before starting transition
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShowNext(true));
    });

    // After transition: swap current ← next, clear next layer
    timerRef.current = setTimeout(() => {
      setCurrent(newLayer);
      setNext(null);
      setShowNext(false);
      timerRef.current = null;
    }, fadeDuration + 50); // slight buffer over CSS transition
  }, [src, alt, mimeType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current && !next) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-testid="cross-fade-image"
      role="img"
      aria-label={next ? (next.alt || undefined) : (current?.alt || undefined)}
    >
      {/* Current image (fades out when next is shown) — aria-hidden when being replaced */}
      {current && (
        <img
          src={current.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: showNext ? 0 : 1,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          }}
          data-testid="cross-fade-current"
        />
      )}
      {/* Next image (fades in) — aria-hidden while invisible, presented via container role */}
      {next && (
        <img
          src={next.src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: showNext ? 1 : 0,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
          }}
          data-testid="cross-fade-next"
        />
      )}
    </div>
  );
}

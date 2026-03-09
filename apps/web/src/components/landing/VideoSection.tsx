import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

export function VideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section || prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => {
            // Autoplay blocked — poster image shows instead
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      data-testid="video-section"
      className="py-20 px-6 bg-muted/30"
      aria-label="Product demo"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">See EduSphere in Action</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Watch how students and instructors collaborate in a unified learning environment.
        </p>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video bg-muted">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src="/product-demo.mp4"
            muted
            playsInline
            preload="none"
            aria-label="EduSphere product demonstration video"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Product demo video</p>
          </div>
        </div>
      </div>
    </section>
  );
}

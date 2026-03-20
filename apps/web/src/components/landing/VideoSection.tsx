import { useTranslation } from 'react-i18next';
import { Player } from '@remotion/player';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';
import { LiveCollab } from '@/remotion/LiveCollab';

export function VideoSection() {
  const { t } = useTranslation('common');
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="demo"
      data-testid="video-section"
      className="py-20 px-6 bg-muted/30"
      aria-label="Product demo"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">{t('landing.video.title')}</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('landing.video.subtitle')}
        </p>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video bg-[#0f1117]">
          {prefersReducedMotion ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-slate-200 text-sm">{t('landing.video.demoLabel')}</p>
              <p className="text-xs text-slate-300">
                {t('landing.video.motionReduced')}
              </p>
            </div>
          ) : (
            <Player
              component={LiveCollab}
              durationInFrames={750}
              fps={30}
              compositionWidth={1280}
              compositionHeight={720}
              style={{ width: '100%', height: '100%' }}
              autoPlay
              loop
            />
          )}
        </div>
      </div>
    </section>
  );
}

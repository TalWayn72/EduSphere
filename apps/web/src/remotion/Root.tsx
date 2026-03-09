import { Composition } from 'remotion';
import { HeroBackground } from './HeroBackground';
import { StatsCounter } from './StatsCounter';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HeroBackground"
        component={HeroBackground}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="StatsCounter"
        component={StatsCounter}
        durationInFrames={120}
        fps={30}
        width={400}
        height={200}
        defaultProps={{ targetValue: 500000, label: 'Active Learners', suffix: '+' }}
      />
    </>
  );
}

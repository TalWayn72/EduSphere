import { Composition } from 'remotion';
import { AIChavrutaTyping } from './AIChavrutaTyping';
import { HeroBackground } from './HeroBackground';
import { KnowledgeGraphGrow } from './KnowledgeGraphGrow';
import { LiveCollab } from './LiveCollab';
import { OnboardingSpeed } from './OnboardingSpeed';
import { ProgressJourney } from './ProgressJourney';
import { StatsCounter } from './StatsCounter';

export function RemotionRoot() {
  return (
    <>
      {/* V1 — Hero background: knowledge graph growing (12 s) */}
      <Composition
        id="KnowledgeGraphGrow"
        component={KnowledgeGraphGrow}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* V2 — AI Chavruta typing demo (8 s) */}
      <Composition
        id="AIChavrutaTyping"
        component={AIChavrutaTyping}
        durationInFrames={240}
        fps={30}
        width={600}
        height={400}
      />
      {/* V3 — Progress / XP journey (6 s) */}
      <Composition
        id="ProgressJourney"
        component={ProgressJourney}
        durationInFrames={180}
        fps={30}
        width={800}
        height={150}
      />
      {/* V4 — Live collaboration product demo (25 s) */}
      <Composition
        id="LiveCollab"
        component={LiveCollab}
        durationInFrames={750}
        fps={30}
        width={1280}
        height={720}
      />
      {/* V5 — Onboarding speed (10 s) */}
      <Composition
        id="OnboardingSpeed"
        component={OnboardingSpeed}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={400}
      />
      {/* Legacy compositions */}
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

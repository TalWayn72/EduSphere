/**
 * Unit tests for VoiceProfileCard.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VoiceProfile } from './polished-transcript.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'polishedTranscript.voiceProfile.title': 'Voice Profile',
        'polishedTranscript.voiceProfile.formality': 'Formality',
        'polishedTranscript.voiceProfile.avgWords': `Avg. ${opts?.count ?? 0} words/sentence`,
        'polishedTranscript.voiceProfile.topPhrases': 'Characteristic phrases',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, 'data-testid': testId }: {
    children: React.ReactNode; className?: string; 'data-testid'?: string;
  }) => <div data-testid={testId} className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <h4 className={className}>{children}</h4>,
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <p className={className}>{children}</p>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress-bar" data-value={value} className={className} />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="phrase-badge" data-variant={variant}>{children}</span>
  ),
}));

import { VoiceProfileCard } from './VoiceProfileCard';

const VOICE_PROFILE: VoiceProfile = {
  id: 'vp-1',
  instructorId: 'usr-1',
  displayName: 'Rabbi Cohen',
  avgWordsPerSentence: 14,
  formalityScore: 82,
  topPhrases: ['כמו שאמרנו', 'לכן', 'נראה שכן'],
  lastUpdatedAt: '2026-01-01T00:00:00Z',
};

describe('VoiceProfileCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the card with testid', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    expect(screen.getByTestId('voice-profile-card')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    expect(screen.getByText('Voice Profile')).toBeInTheDocument();
  });

  it('renders the instructor display name', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    expect(screen.getByText('Rabbi Cohen')).toBeInTheDocument();
  });

  it('renders formality progress bar with correct value', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', '82');
  });

  it('renders avg words per sentence', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    expect(screen.getByText('Avg. 14 words/sentence')).toBeInTheDocument();
  });

  it('renders top phrases as badges', () => {
    render(<VoiceProfileCard voiceProfile={VOICE_PROFILE} />);
    const badges = screen.getAllByTestId('phrase-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0].textContent).toBe('כמו שאמרנו');
  });

  it('limits displayed phrases to 5', () => {
    const manyPhrases = {
      ...VOICE_PROFILE,
      topPhrases: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'],
    };
    render(<VoiceProfileCard voiceProfile={manyPhrases} />);
    expect(screen.getAllByTestId('phrase-badge')).toHaveLength(5);
  });

  it('does not render phrase section when topPhrases is empty', () => {
    const noPhrases = { ...VOICE_PROFILE, topPhrases: [] };
    render(<VoiceProfileCard voiceProfile={noPhrases} />);
    expect(screen.queryByText('Characteristic phrases')).not.toBeInTheDocument();
  });
});

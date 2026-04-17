/**
 * VoiceProfileCard — summary card for the instructor's AI voice profile.
 *
 * Shows the formality score, avg sentence length, and top characteristic phrases.
 * Used in the polished transcript tab sidebar.
 */
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VoiceProfile } from './polished-transcript.types';

interface VoiceProfileCardProps {
  voiceProfile: VoiceProfile;
  className?: string;
}

export function VoiceProfileCard({
  voiceProfile,
  className = '',
}: VoiceProfileCardProps) {
  const { t } = useTranslation('content');

  return (
    <Card className={className} data-testid="voice-profile-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {t('polishedTranscript.voiceProfile.title')}
        </CardTitle>
        <CardDescription className="text-xs">
          {voiceProfile.displayName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Formality score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('polishedTranscript.voiceProfile.formality')}</span>
            <span>{voiceProfile.formalityScore}%</span>
          </div>
          <Progress value={voiceProfile.formalityScore} className="h-1.5" />
        </div>

        {/* Avg sentence length */}
        <p className="text-xs text-muted-foreground">
          {t('polishedTranscript.voiceProfile.avgWords', {
            count: Math.round(voiceProfile.avgWordsPerSentence),
          })}
        </p>

        {/* Top phrases */}
        {voiceProfile.topPhrases.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t('polishedTranscript.voiceProfile.topPhrases')}
            </p>
            <div className="flex flex-wrap gap-1" dir="rtl">
              {voiceProfile.topPhrases.slice(0, 5).map((phrase) => (
                <Badge
                  key={phrase}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {phrase}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

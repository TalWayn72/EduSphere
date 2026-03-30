/**
 * MatchPanel — human/AI Chavruta matching UI.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bot, Loader2, CheckCircle } from 'lucide-react';
import type { MatchState } from './collaboration.types';

interface MatchPanelProps {
  matchState: MatchState;
  matchMode: 'human' | 'ai';
  isCreating: boolean;
  onStartMatching: (mode: 'human' | 'ai') => void;
  onCreateChavruta: () => void;
}

export function MatchPanel({
  matchState,
  matchMode,
  isCreating,
  onStartMatching,
  onCreateChavruta,
}: MatchPanelProps) {
  const { t } = useTranslation(['collaboration', 'common']);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Human Chavruta */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold">{t('humanChavruta')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('humanChavrutaDescription')}</p>
            {matchState === 'idle' || matchMode !== 'human' ? (
              <Button className="w-full" onClick={() => onStartMatching('human')}>
                {t('findPartner')}
              </Button>
            ) : matchState === 'searching' ? (
              <Button className="w-full" variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('searchingPartner')}
              </Button>
            ) : (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-500"
                onClick={onCreateChavruta}
                disabled={isCreating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCreating ? t('creatingSession') : t('partnerFound')}
              </Button>
            )}
          </div>

          {/* AI Chavruta */}
          <div className="space-y-3 border-l pl-6">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h2 className="font-semibold">{t('aiChavruta')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('aiChavrutaDescription')}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-600" />
              <span>{t('alwaysAvailable')}</span>
            </div>
            {matchState === 'idle' || matchMode !== 'ai' ? (
              <Button className="w-full" variant="outline" onClick={() => onStartMatching('ai')}>
                {t('startAiChavruta')}
              </Button>
            ) : matchState === 'searching' ? (
              <Button className="w-full" variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('connectingAi')}
              </Button>
            ) : (
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500 dark:text-white">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('openingSession')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

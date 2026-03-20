import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FIND_CHAVRUTA_PARTNERS_QUERY,
  CREATE_CHAVRUTA_SESSION_MUTATION,
} from '@/lib/graphql/chavruta-partner.queries';

interface ChavrutaMatch {
  partnerId: string;
  partnerName: string;
  courseId: string;
  topic: string;
  matchReason: string;
  compatibilityScore: number;
}

export function ChavrutaPartnerPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [{ data, fetching, error }] = useQuery({
    query: FIND_CHAVRUTA_PARTNERS_QUERY,
    variables: { input: { courseId } },
    pause: !mounted || courseId.length < 3,
  });

  const [{ fetching: creating }, createSession] = useMutation(
    CREATE_CHAVRUTA_SESSION_MUTATION,
  );

  const handleRequestPartner = async (partnerId: string, topic: string) => {
    // SI-10: Frontend consent gate — check localStorage before calling backend.
    if (localStorage.getItem('edusphere_consent_AI_PROCESSING') !== 'true') {
      toast.error('AI features require your consent.', {
        action: {
          label: 'Enable in Settings',
          onClick: () => navigate('/settings?highlight=ai-consent&returnTo=/chavruta/partner'),
        },
      });
      return;
    }
    setSelectedPartnerId(partnerId);
    const result = await createSession({ input: { partnerId, courseId, topic } });
    if (result.error) {
      const consentErr = result.error.graphQLErrors?.find(
        (e) => e.extensions?.code === 'CONSENT_REQUIRED'
      );
      if (consentErr) {
        console.error(
          '[ChavrutaPartnerPage] AI features require consent:',
          consentErr.message,
        );
        toast.error('AI features require your consent.', {
          action: {
            label: 'Enable in Settings',
            onClick: () => navigate('/settings?highlight=ai-consent&returnTo=/chavruta/partner'),
          },
        });
      } else {
        console.error(
          '[ChavrutaPartnerPage] Failed to create session:',
          result.error.message,
        );
      }
    }
  };

  const matches: ChavrutaMatch[] = data?.chavrutaPartnerMatches ?? [];

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('chavruta.pageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('chavruta.pageDescription')}
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t('chavruta.courseIdPlaceholder')}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="flex-1"
            aria-label={t('chavruta.courseIdAriaLabel')}
          />
        </div>

        {fetching && (
          <p className="text-sm text-muted-foreground">{t('chavruta.searching')}</p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {t('chavruta.loadError')}
          </p>
        )}
        {!fetching && !error && courseId.length >= 3 && matches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('chavruta.noPartners')}
          </p>
        )}

        <div className="space-y-4" role="list" aria-label={t('chavruta.partnersAriaLabel')}>
          {matches.map((match) => (
            <Card key={match.partnerId} role="listitem">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{match.partnerName}</span>
                  <Badge variant="secondary">
                    {Math.round(match.compatibilityScore * 100)}% match
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-1 text-sm text-muted-foreground">{match.matchReason}</p>
                <p className="mb-3 text-sm">
                  <span className="font-medium">{t('chavruta.suggestedTopic')}</span> {match.topic}
                </p>
                <Button
                  size="sm"
                  onClick={() => handleRequestPartner(match.partnerId, match.topic)}
                  disabled={creating && selectedPartnerId === match.partnerId}
                  aria-label={t('chavruta.requestAriaLabel', { name: match.partnerName })}
                >
                  {creating && selectedPartnerId === match.partnerId
                    ? t('chavruta.sending')
                    : t('chavruta.requestSession')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

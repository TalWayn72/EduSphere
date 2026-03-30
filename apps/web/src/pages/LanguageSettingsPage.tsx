/**
 * LanguageSettingsPage - Tenant language configuration.
 * Route: /admin/languages
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'urql';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { SAVED_CONFIRMATION_MS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthRole } from '@/hooks/useAuthRole';
import { Languages, Loader2, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import {
  TENANT_LANGUAGE_SETTINGS_QUERY,
  UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION,
} from '@/lib/graphql/admin-language.queries';
import {
  ADMIN_ROLES,
  AVAILABLE_LOCALES,
} from './LanguageSettingsPage.locales';
import type { QueryResult } from './LanguageSettingsPage.locales';
import { LanguageListCard } from './LanguageListCard';
import { LanguagePreviewCard } from './LanguagePreviewCard';

function RtlBadge() {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono dark:bg-amber-900 dark:text-amber-300">
      RTL
    </span>
  );
}

export { RtlBadge };

export function LanguageSettingsPage() {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const role = useAuthRole();
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [supported, setSupported] = useState<Set<string>>(new Set(['en']));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [queryResult] = useQuery<QueryResult>({
    query: TENANT_LANGUAGE_SETTINGS_QUERY,
    pause: !mounted,
  });
  const [mutResult, updateSettings] = useMutation(
    UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION
  );

  useEffect(() => {
    const s = queryResult.data?.myTenantLanguageSettings;
    if (s) {
      setDefaultLanguage(s.defaultLanguage);
      setSupported(new Set(s.supportedLanguages));
    }
  }, [queryResult.data]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        if (import.meta.env.DEV) console.debug('[LanguageSettingsPage] cleanup: saved timer cleared on unmount');
      }
    };
  }, []);

  if (!role || !ADMIN_ROLES.has(role)) {
    navigate('/dashboard');
    return null;
  }

  const handleToggleSupported = (code: string) => {
    if (code === defaultLanguage) return;
    setSupported((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    setSaved(false);
    setSaveError(null);
  };

  const handleDefaultChange = (code: string) => {
    setDefaultLanguage(code);
    setSupported((prev) => new Set([...prev, code]));
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    const result = await updateSettings({
      input: { defaultLanguage, supportedLanguages: [...supported] },
    });
    if (result.error) {
      setSaveError(t('languageAdmin.saveError'));
    } else {
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), SAVED_CONFIRMATION_MS);
    }
  };

  const defaultLocale = AVAILABLE_LOCALES.find(
    (l) => l.code === defaultLanguage
  );

  return (
    <Layout>
      <PageShell size="sm" className="max-w-3xl">
        <Breadcrumbs
          items={[
            { label: t('title'), href: '/settings' },
            { label: t('language.title') },
          ]}
        />
        <div className="flex items-center gap-3">
          <Languages className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('languageAdmin.title')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('languageAdmin.subtitle')}
            </p>
          </div>
        </div>

        {queryResult.fetching ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" /> {t('languageAdmin.loading')}
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('languageAdmin.defaultLanguage')}</CardTitle>
                <CardDescription>
                  {t('languageAdmin.defaultLanguageDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={defaultLanguage}
                  onChange={(e) => handleDefaultChange(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                >
                  {AVAILABLE_LOCALES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} - {l.nativeName}
                      {l.rtl ? ' (RTL)' : ''}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            <LanguageListCard
              supported={supported}
              defaultLanguage={defaultLanguage}
              onToggle={handleToggleSupported}
              RtlBadge={RtlBadge}
            />

            <LanguagePreviewCard
              supported={supported}
              defaultLanguage={defaultLanguage}
              defaultLocale={defaultLocale}
            />

            <div className="flex items-center gap-4 pb-8">
              <Button
                onClick={() => void handleSave()}
                disabled={mutResult.fetching || supported.size === 0}
              >
                {mutResult.fetching && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('languageAdmin.saveChanges')}
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> {t('languageAdmin.saved')}
                </span>
              )}
              {saveError && (
                <span className="text-sm text-destructive">{saveError}</span>
              )}
            </div>
          </>
        )}
      </PageShell>
    </Layout>
  );
}

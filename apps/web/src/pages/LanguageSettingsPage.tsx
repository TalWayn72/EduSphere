/**
 * LanguageSettingsPage - Tenant language configuration.
 * Route: /admin/languages
 * Access: ORG_ADMIN, SUPER_ADMIN only
 */
import React, { useEffect, useRef, useState } from 'react';
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
import { Languages, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageShell } from '@/components/PageShell';
import {
  TENANT_LANGUAGE_SETTINGS_QUERY,
  UPDATE_TENANT_LANGUAGE_SETTINGS_MUTATION,
} from '@/lib/graphql/admin-language.queries';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

interface Locale {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

const AVAILABLE_LOCALES: Locale[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '中文（简体）',
    rtl: false,
  },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    rtl: false,
  },
];

interface LanguageSettings {
  supportedLanguages: string[];
  defaultLanguage: string;
}

interface QueryResult {
  myTenantLanguageSettings: LanguageSettings | null;
}

function RtlBadge() {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono dark:bg-amber-900 dark:text-amber-300">
      RTL
    </span>
  );
}

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
        console.error('[LanguageSettingsPage] cleanup: saved timer cleared on unmount');
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

            <Card>
              <CardHeader>
                <CardTitle>{t('languageAdmin.enabledLanguages')}</CardTitle>
                <CardDescription>
                  {t('languageAdmin.enabledLanguagesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {supported.size === 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {t('languageAdmin.atLeastOne')}
                  </div>
                )}
                {AVAILABLE_LOCALES.map((l) => {
                  const isDefault = l.code === defaultLanguage;
                  const isChecked = supported.has(l.code);
                  return (
                    <label
                      key={l.code}
                      className={
                        'flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer' +
                        (isDefault ? ' opacity-70' : '')
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDefault}
                        onChange={() => handleToggleSupported(l.code)}
                        className="h-4 w-4 rounded border"
                      />
                      <span className="text-sm font-medium flex-1">
                        {l.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {l.nativeName}
                      </span>
                      {l.rtl && <RtlBadge />}
                      {isDefault && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {t('languageAdmin.default')}
                        </span>
                      )}
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('languageAdmin.preview')}</CardTitle>
                <CardDescription>
                  {t('languageAdmin.previewDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 text-sm">
                  {AVAILABLE_LOCALES.filter((l) => supported.has(l.code)).map(
                    (l) => (
                      <span
                        key={l.code}
                        dir={l.rtl ? 'rtl' : 'ltr'}
                        className={
                          'px-3 py-1.5 rounded-full border text-sm' +
                          (l.code === defaultLanguage
                            ? ' bg-primary text-primary-foreground border-primary font-medium'
                            : ' bg-muted border-transparent')
                        }
                      >
                        {l.nativeName}
                      </span>
                    )
                  )}
                </div>
                {defaultLocale && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('languageAdmin.default')}: <strong>{defaultLocale.name}</strong>
                    {defaultLocale.rtl
                      ? ` - ${t('languageAdmin.rtlApplied')}`
                      : ''}
                  </p>
                )}
              </CardContent>
            </Card>

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

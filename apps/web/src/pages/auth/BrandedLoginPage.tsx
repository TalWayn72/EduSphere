/**
 * BrandedLoginPage — Org-branded login page.
 * Route: /org/:slug/login
 * Public endpoint — no authentication required.
 */
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'urql';
import { useTranslation } from 'react-i18next';
import { BRANDED_LOGIN_DATA_QUERY } from '@/lib/graphql/branding.queries';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Loader2, BookOpen, LogIn } from 'lucide-react';

interface SsoProvider {
  id: string;
  name: string;
  type: string;
  iconUrl: string | null;
}

interface BrandedLoginData {
  orgName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
  ssoProviders: SsoProvider[];
}

interface BrandedLoginQueryResult {
  brandedLoginData: BrandedLoginData | null;
}

function buildKeycloakUrl(slug: string, idpHint?: string): string {
  const base = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
  const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'edusphere';
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'edusphere-web';
  const redirectUri = encodeURIComponent(
    `${window.location.origin}/oauth/google/callback`
  );
  let url =
    `${base}/realms/${realm}/protocol/openid-connect/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=openid%20profile%20email`;
  if (idpHint) {
    url += `&kc_idp_hint=${encodeURIComponent(idpHint)}`;
  }
  return url;
}

export function BrandedLoginPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { t } = useTranslation('auth');

  const [{ data, fetching }] = useQuery<BrandedLoginQueryResult>({
    query: BRANDED_LOGIN_DATA_QUERY,
    variables: { slug },
    pause: !slug,
    requestPolicy: 'cache-and-network',
  });

  const branding = data?.brandedLoginData ?? null;

  const accentStyle = useMemo(() => {
    if (!branding?.primaryColor) return {};
    return {
      '--branded-primary': branding.primaryColor,
      '--branded-secondary': branding.secondaryColor ?? branding.primaryColor,
    } as React.CSSProperties;
  }, [branding]);

  const handleLogin = () => {
    window.location.href = buildKeycloakUrl(slug);
  };

  const handleSsoLogin = (provider: SsoProvider) => {
    window.location.href = buildKeycloakUrl(slug, provider.id);
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t('orgNotFound', 'Organization not found')}</CardTitle>
            <CardDescription>
              {t(
                'orgNotFoundDesc',
                'The organization slug is invalid or does not exist.'
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950 px-4"
      style={accentStyle}
      data-testid="branded-login-page"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.orgName}
                className="h-16 object-contain"
                data-testid="branded-logo"
              />
            ) : (
              <div className="p-4 bg-primary/10 rounded-full">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-none tracking-tight">
            {branding.orgName}
          </h1>
          {branding.welcomeMessage && (
            <CardDescription data-testid="branded-welcome-message">
              {branding.welcomeMessage}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
            data-testid="branded-login-btn"
            style={
              branding.primaryColor
                ? { backgroundColor: branding.primaryColor }
                : undefined
            }
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t('signIn', 'Sign In')}
          </Button>

          {branding.ssoProviders.length > 0 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t('orContinueWith', 'or continue with')}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {branding.ssoProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSsoLogin(provider)}
                    data-testid={`sso-btn-${provider.id}`}
                  >
                    {provider.iconUrl && (
                      <img
                        src={provider.iconUrl}
                        alt=""
                        className="h-4 w-4 mr-2"
                      />
                    )}
                    {t('signInWith', { provider: provider.name })}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

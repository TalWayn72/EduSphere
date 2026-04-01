/**
 * BrandedLoginPage — Org-branded login page component.
 * Uses org branding (logo, colors, welcome text) from the useBrandedLogin hook.
 * Falls back to default EduSphere branding when no org config is available.
 * Integrates with Keycloak OIDC auth flow + optional SSO providers.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBrandedLogin, type SsoProvider } from '@/hooks/useBrandedLogin';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Loader2, BookOpen, LogIn } from 'lucide-react';

interface BrandedLoginPageProps {
  /** Organization slug (e.g. 'acme') */
  slug: string;
}

/** Render a single SSO provider button. */
function SsoButton({
  provider,
  onClick,
  label,
}: {
  provider: SsoProvider;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={onClick}
      data-testid={`sso-btn-${provider.id}`}
    >
      {provider.iconUrl && (
        <img src={provider.iconUrl} alt="" className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}

export function BrandedLoginPage({ slug }: BrandedLoginPageProps) {
  const { t } = useTranslation('auth');
  const {
    orgName,
    logoUrl,
    primaryColor,
    welcomeMessage,
    ssoProviders,
    isLoading,
    isOrgFound,
    keycloakAuthUrl,
    buildSsoUrl,
  } = useBrandedLogin(slug);

  const accentStyle = useMemo(() => {
    return {
      '--branded-primary': primaryColor,
    } as React.CSSProperties;
  }, [primaryColor]);

  const handleLogin = () => {
    window.location.href = keycloakAuthUrl;
  };

  const handleSsoLogin = (provider: SsoProvider) => {
    window.location.href = buildSsoUrl(provider.id);
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        data-testid="branded-login-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOrgFound) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        data-testid="branded-login-not-found"
      >
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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={orgName}
                className="h-16 object-contain"
                data-testid="branded-logo"
              />
            ) : (
              <div
                className="p-4 bg-primary/10 rounded-full"
                data-testid="branded-default-icon"
              >
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-semibold leading-none tracking-tight">
            {orgName}
          </h1>
          {welcomeMessage && (
            <CardDescription data-testid="branded-welcome-message">
              {welcomeMessage}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleLogin}
            data-testid="branded-login-btn"
            style={{ backgroundColor: primaryColor }}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t('signIn', 'Sign In')}
          </Button>

          {ssoProviders.length > 0 && (
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
              <div className="space-y-2" data-testid="sso-providers">
                {ssoProviders.map((provider) => (
                  <SsoButton
                    key={provider.id}
                    provider={provider}
                    onClick={() => handleSsoLogin(provider)}
                    label={t('signInWith', {
                      provider: provider.name,
                    })}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

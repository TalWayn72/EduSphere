import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login, isAuthenticated, DEV_MODE } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BookOpen, ShieldAlert } from 'lucide-react';

export function Login() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">{t('welcome')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {DEV_MODE ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Dev Mode</strong> — Keycloak bypassed. Signing in as{' '}
                  <code className="font-mono">super.admin@edusphere.dev</code>{' '}
                  (SUPER_ADMIN).
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleLogin}
                data-testid="dev-login-btn"
              >
                Sign In (Dev Mode)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('organizationalAccount')}
              </p>
              <Button className="w-full" size="lg" onClick={handleLogin}>
                {t('signInWith', { provider: 'Keycloak' })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

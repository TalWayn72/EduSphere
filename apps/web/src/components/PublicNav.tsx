import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface PublicNavProps {
  variant?: 'full' | 'minimal';
}

export function PublicNav({ variant = 'full' }: PublicNavProps) {
  const { t } = useTranslation('auth');
  const { t: tNav } = useTranslation('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const isFull = variant === 'full';
  const { pathname } = useLocation();
  const isLanding = pathname === '/' || pathname === '/landing';
  const anchor = (hash: string) => (isLanding ? hash : `/landing${hash}`);
  const smoothScroll = (hash: string) => (e: React.MouseEvent) => {
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el && isLanding) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      data-testid="public-nav"
      className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-100 dark:border-slate-700 shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Logo />

        {isFull && (
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-slate-200">
            <a
              href={anchor('#features')}
              onClick={smoothScroll('#features')}
              className="hover:text-indigo-600 transition-colors"
            >
              {tNav('features')}
            </a>
            <a
              href={anchor('#pricing')}
              onClick={smoothScroll('#pricing')}
              className="hover:text-indigo-600 transition-colors"
            >
              {tNav('pricing')}
            </a>
            <a
              href={anchor('#compliance')}
              onClick={smoothScroll('#compliance')}
              className="hover:text-indigo-600 transition-colors"
            >
              {tNav('compliance')}
            </a>
            <a
              href={anchor('#pilot-cta')}
              onClick={smoothScroll('#pilot-cta')}
              className="hover:text-indigo-600 transition-colors"
            >
              {tNav('pilot')}
            </a>
          </div>
        )}

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-gray-700 dark:text-white"
          >
            <Link to="/login">{t('logIn')}</Link>
          </Button>
          {isFull && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-500 dark:text-white"
              asChild
            >
              <a
                href={anchor('#pilot-cta')}
                onClick={smoothScroll('#pilot-cta')}
              >
                {tNav('startFreePilot')}
              </a>
            </Button>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md text-gray-600 dark:text-slate-200 hover:text-indigo-600"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          {isFull && (
            <>
              <a
                href={anchor('#features')}
                onClick={(e) => {
                  smoothScroll('#features')(e);
                  setMenuOpen(false);
                }}
                className="text-gray-700 dark:text-slate-200 hover:text-indigo-600"
              >
                {tNav('features')}
              </a>
              <a
                href={anchor('#pricing')}
                onClick={(e) => {
                  smoothScroll('#pricing')(e);
                  setMenuOpen(false);
                }}
                className="text-gray-700 dark:text-slate-200 hover:text-indigo-600"
              >
                {tNav('pricing')}
              </a>
              <a
                href={anchor('#compliance')}
                onClick={(e) => {
                  smoothScroll('#compliance')(e);
                  setMenuOpen(false);
                }}
                className="text-gray-700 dark:text-slate-200 hover:text-indigo-600"
              >
                {tNav('compliance')}
              </a>
              <a
                href={anchor('#pilot-cta')}
                onClick={(e) => {
                  smoothScroll('#pilot-cta')(e);
                  setMenuOpen(false);
                }}
                className="text-gray-700 dark:text-slate-200 hover:text-indigo-600"
              >
                {tNav('pilot')}
              </a>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/login">{t('logIn')}</Link>
            </Button>
            {isFull && (
              <Button
                size="sm"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-500 dark:text-white"
                asChild
              >
                <a
                  href={anchor('#pilot-cta')}
                  onClick={smoothScroll('#pilot-cta')}
                >
                  {tNav('freePilot')}
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

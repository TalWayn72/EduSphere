import type { ReactNode } from 'react';
import { PublicNav } from '@/components/PublicNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface PublicLayoutProps {
  children: ReactNode;
  navVariant?: 'full' | 'minimal';
  showFooter?: boolean;
}

export function PublicLayout({
  children,
  navVariant = 'full',
  showFooter = true,
}: PublicLayoutProps) {
  return (
    <div data-testid="public-layout" className="min-h-screen bg-background flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to main content
      </a>
      <PublicNav variant={navVariant} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {showFooter && <LandingFooter />}
    </div>
  );
}

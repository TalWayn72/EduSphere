import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import { SocialLinksBar, DEFAULT_SOCIAL_LINKS } from '@/components/social';

function useFooterColumns() {
  const { t } = useTranslation('common');
  return [
    {
      heading: t('landing.footer.product'),
      links: [
        { label: t('landing.footer.features'), href: '/#features' },
        { label: t('landing.footer.pricing'), href: '/#pricing' },
        { label: t('landing.footer.aiCourseBuilder'), href: '/features/ai-course-builder' },
        { label: t('landing.footer.visualAnchoring'), href: '/features/visual-anchoring' },
        { label: t('landing.footer.knowledgeGraph'), href: '/features/knowledge-graph' },
      ],
    },
    {
      heading: t('landing.footer.solutions'),
      links: [
        { label: t('landing.footer.universities'), href: '/solutions/universities' },
        { label: t('landing.footer.enterprises'), href: '/solutions/enterprises' },
        { label: t('landing.footer.governmentDefense'), href: '/solutions/government' },
        { label: t('landing.footer.trainingCompanies'), href: '/solutions/training' },
      ],
    },
    {
      heading: t('landing.footer.compliance'),
      links: [
        { label: 'FERPA', href: '/compliance#ferpa' },
        { label: 'WCAG 2.2 AA', href: '/compliance#wcag' },
        { label: 'SCORM', href: '/compliance#scorm' },
        { label: 'GDPR', href: '/compliance#gdpr' },
        { label: t('landing.footer.airGapped'), href: '/compliance#air-gapped' },
        { label: t('landing.footer.security'), href: '/compliance#security' },
      ],
    },
    {
      heading: t('landing.footer.company'),
      links: [
        { label: t('landing.footer.about'), href: '/about' },
        { label: t('landing.footer.blog'), href: '/blog' },
        { label: t('landing.footer.careers'), href: '/careers' },
        { label: t('landing.footer.contact'), href: '/contact' },
        { label: t('landing.footer.privacyPolicy'), href: '/privacy' },
        { label: t('landing.footer.terms'), href: '/terms' },
        { label: t('landing.footer.accessibilityStatement'), href: '/accessibility' },
      ],
    },
  ];
}

export function LandingFooter() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const COLUMNS = useFooterColumns();

  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const hash = href.split('#')[1] ?? '';
    if (!hash) return;
    if (window.location.pathname === '/' || window.location.pathname === '/landing') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { replace: false });
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  return (
    <footer data-testid="landing-footer" className="bg-slate-900 text-slate-400 pt-16 pb-8 dark:bg-slate-100 dark:text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-10">
          <Brain className="h-7 w-7 text-indigo-400 dark:text-indigo-300" aria-hidden="true" />
          <span className="text-white font-bold text-xl dark:text-white">EduSphere</span>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-white font-semibold text-sm mb-4 dark:text-white">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.includes('#') && link.href.startsWith('/') && link.href.split('#')[0] === '/' ? (
                      <a
                        href={link.href}
                        onClick={(e) => handleHashLink(e, link.href)}
                        className="text-sm text-slate-400 hover:text-white transition-colors dark:text-slate-500"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-slate-400 hover:text-white transition-colors dark:text-slate-500"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <SocialLinksBar links={DEFAULT_SOCIAL_LINKS} size="md" />
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 dark:border-slate-300">
          <p className="text-sm">
            {t('landing.footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <Link to="/privacy" className="hover:text-white transition-colors">{t('landing.footer.privacy')}</Link>
            <span aria-hidden="true">&middot;</span>
            <Link to="/terms" className="hover:text-white transition-colors">{t('landing.footer.terms')}</Link>
            <span aria-hidden="true">&middot;</span>
            <Link to="/accessibility" className="hover:text-white transition-colors">{t('landing.footer.accessibility')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

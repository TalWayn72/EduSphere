import React, { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { SmartRoot } from '@/components/SmartRoot';
import { publicPage } from './helpers';

const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// ── Lazy loaded public pages ─────────────────────────────────────────────────
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const ContactPage = lazy(() =>
  import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const CompliancePage = lazy(() =>
  import('@/pages/CompliancePage').then((m) => ({ default: m.CompliancePage }))
);
const SolutionsPage = lazy(() =>
  import('@/pages/SolutionsPage').then((m) => ({ default: m.SolutionsPage }))
);
const PrivacyPage = lazy(() =>
  import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const CareersPage = lazy(() =>
  import('@/pages/CareersPage').then((m) => ({ default: m.CareersPage }))
);
const AccessibilityStatementPage = lazy(() =>
  import('@/pages/AccessibilityStatementPage').then((m) => ({
    default: m.AccessibilityStatementPage,
  }))
);
const FaqPage = lazy(() =>
  import('@/pages/FaqPage').then((m) => ({ default: m.FaqPage }))
);
const FeaturesPage = lazy(() =>
  import('@/pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage }))
);
const GlossaryPage = lazy(() =>
  import('@/pages/GlossaryPage').then((m) => ({ default: m.GlossaryPage }))
);
const PricingPage = lazy(() =>
  import('@/pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const CourseCatalogPage = lazy(() =>
  import('@/pages/CourseCatalogPage').then((m) => ({ default: m.CourseCatalogPage }))
);
const InstructorDirectoryPage = lazy(() =>
  import('@/pages/InstructorDirectoryPage').then((m) => ({
    default: m.InstructorDirectoryPage,
  }))
);
const BlogListPage = lazy(() =>
  import('@/pages/BlogListPage').then((m) => ({ default: m.BlogListPage }))
);
const BlogPostPage = lazy(() =>
  import('@/pages/BlogPostPage').then((m) => ({ default: m.BlogPostPage }))
);
const BadgeVerifierPage = lazy(() =>
  import('@/pages/BadgeVerifierPage').then((m) => ({
    default: m.BadgeVerifierPage,
  }))
);
const PublicProfilePage = lazy(() =>
  import('@/pages/PublicProfilePage').then((m) => ({
    default: m.PublicProfilePage,
  }))
);
const LtiLaunchPage = lazy(() =>
  import('@/pages/LtiLaunchPage').then((m) => ({ default: m.LtiLaunchPage }))
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/OAuthCallbackPage').then((m) => ({
    default: m.OAuthCallbackPage,
  }))
);
const PilotSignupPage = lazy(() =>
  import('@/pages/PilotSignupPage').then((m) => ({ default: m.PilotSignupPage }))
);
const PartnerSignupPage = lazy(() =>
  import('@/pages/PartnerSignupPage').then((m) => ({ default: m.PartnerSignupPage }))
);
const PortalPage = lazy(() =>
  import('@/pages/PortalPage').then((m) => ({ default: m.PortalPage }))
);
const OrgSignupWizard = lazy(() =>
  import('@/pages/signup/OrgSignupWizard').then((m) => ({ default: m.OrgSignupWizard }))
);
const BrandedLoginPage = lazy(() =>
  import('@/pages/auth/BrandedLoginPage').then((m) => ({ default: m.BrandedLoginPage }))
);

/**
 * Public routes — no authentication required.
 * Includes: marketing pages, legal, AEO, auth callbacks, LTI launch.
 */
export const publicRoutes: RouteObject[] = [
  { path: '/login', element: publicPage(<Login />) },
  // LTI 1.3 deep-link handler — intentionally public
  { path: '/lti/launch', element: publicPage(<LtiLaunchPage />) },
  // Public marketing landing page
  { path: '/landing', element: publicPage(<LandingPage />) },
  // Demo request → redirect to pilot signup
  { path: '/demo', element: <Navigate to="/pilot" replace /> },
  { path: '/contact', element: publicPage(<ContactPage />) },
  // Public compliance overview — static page with section anchors
  { path: '/compliance', element: publicPage(<CompliancePage />) },
  // Feature sub-pages → redirect to main features page
  { path: '/features/:featureSlug', element: <Navigate to="/features" replace /> },
  { path: '/solutions/:solutionSlug', element: publicPage(<SolutionsPage />) },
  { path: '/solutions', element: publicPage(<SolutionsPage />) },
  { path: '/privacy', element: publicPage(<PrivacyPage />) },
  { path: '/terms', element: publicPage(<TermsPage />) },
  { path: '/about', element: publicPage(<AboutPage />) },
  { path: '/careers', element: publicPage(<CareersPage />) },
  { path: '/accessibility', element: publicPage(<AccessibilityStatementPage />) },
  // Public AEO pages
  { path: '/faq', element: publicPage(<FaqPage />) },
  { path: '/features', element: publicPage(<FeaturesPage />) },
  { path: '/glossary', element: publicPage(<GlossaryPage />) },
  { path: '/pricing', element: publicPage(<PricingPage />) },
  // Public course catalog — AEO Phase 2
  { path: '/catalog', element: publicPage(<CourseCatalogPage />) },
  // Public instructor directory — AEO Phase 2
  { path: '/instructors', element: publicPage(<InstructorDirectoryPage />) },
  // Public blog — AEO Phase 3
  { path: '/blog', element: publicPage(<BlogListPage />) },
  { path: '/blog/:slug', element: publicPage(<BlogPostPage />) },
  // Public OpenBadge 3.0 verifier (shareable link)
  { path: '/verify/badge/:assertionId', element: publicPage(<BadgeVerifierPage />) },
  // Google OAuth 2.0 callback — public route
  { path: '/oauth/google/callback', element: publicPage(<OAuthCallbackPage />) },
  // Public partner program signup
  { path: '/partners', element: publicPage(<PartnerSignupPage />) },
  // Public B2B pilot signup
  { path: '/pilot', element: publicPage(<PilotSignupPage />) },
  // Public org self-service signup wizard
  { path: '/signup/org', element: publicPage(<OrgSignupWizard />) },
  // Branded org login page
  { path: '/org/:slug/login', element: publicPage(<BrandedLoginPage />) },
  // Public portal viewer
  { path: '/portal', element: publicPage(<PortalPage />) },
  // Public profile
  { path: '/u/:userId', element: publicPage(<PublicProfilePage />) },
  // Root + catch-all
  { path: '/', element: <SmartRoot /> },
  { path: '*', element: publicPage(<NotFoundPage />) },
];

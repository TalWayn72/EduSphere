import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded admin pages ──────────────────────────────────────────────────
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);
const BrandingSettingsPage = lazy(() =>
  import('@/pages/BrandingSettingsPage').then((m) => ({
    default: m.BrandingSettingsPage,
  }))
);
const LanguageSettingsPage = lazy(() =>
  import('@/pages/LanguageSettingsPage').then((m) => ({
    default: m.LanguageSettingsPage,
  }))
);
const UserManagementPage = lazy(() =>
  import('@/pages/UserManagementPage').then((m) => ({
    default: m.UserManagementPage,
  }))
);
const RoleManagementPage = lazy(() =>
  import('@/pages/RoleManagementPage').then((m) => ({
    default: m.RoleManagementPage,
  }))
);
const GamificationSettingsPage = lazy(() =>
  import('@/pages/GamificationSettingsPage').then((m) => ({
    default: m.GamificationSettingsPage,
  }))
);
const AnnouncementsPage = lazy(() =>
  import('@/pages/AnnouncementsPage').then((m) => ({
    default: m.AnnouncementsPage,
  }))
);
const EnrollmentManagementPage = lazy(() =>
  import('@/pages/EnrollmentManagementPage').then((m) => ({
    default: m.EnrollmentManagementPage,
  }))
);
const AtRiskDashboardPage = lazy(() =>
  import('@/pages/AtRiskDashboardPage').then((m) => ({
    default: m.AtRiskDashboardPage,
  }))
);
const SecuritySettingsPage = lazy(() =>
  import('@/pages/SecuritySettingsPage').then((m) => ({
    default: m.SecuritySettingsPage,
  }))
);
const AuditLogPage = lazy(() =>
  import('@/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
);
const AuditLogAdminPage = lazy(() =>
  import('@/pages/AuditLogAdminPage').then((m) => ({
    default: m.AuditLogAdminPage,
  }))
);
const NotificationTemplatesPage = lazy(() =>
  import('@/pages/NotificationTemplatesPage').then((m) => ({
    default: m.NotificationTemplatesPage,
  }))
);
const BiExportSettingsPage = lazy(() =>
  import('@/pages/BiExportSettingsPage').then((m) => ({
    default: m.BiExportSettingsPage,
  }))
);
const CpdSettingsPage = lazy(() =>
  import('@/pages/CPDSettingsPage').then((m) => ({
    default: m.CPDSettingsPage,
  }))
);
const TenantAnalyticsPage = lazy(() =>
  import('@/pages/TenantAnalyticsPage').then((m) => ({
    default: m.TenantAnalyticsPage,
  }))
);
const OrgUsagePage = lazy(() =>
  import('@/pages/OrgUsagePage').then((m) => ({ default: m.OrgUsagePage }))
);
const PlatformUsageDashboardPage = lazy(() =>
  import('@/pages/PlatformUsageDashboardPage').then((m) => ({
    default: m.PlatformUsageDashboardPage,
  }))
);
const ROIAnalyticsDashboardPage = lazy(() =>
  import('@/pages/ROIAnalyticsDashboardPage').then((m) => ({
    default: m.ROIAnalyticsDashboardPage,
  }))
);
const PilotRequestsAdminPage = lazy(() =>
  import('@/pages/PilotRequestsAdminPage').then((m) => ({ default: m.PilotRequestsAdminPage }))
);
const HrisConfigPage = lazy(() =>
  import('@/pages/HrisConfigPage').then((m) => ({ default: m.HrisConfigPage }))
);
const AutoGradingResultsPage = lazy(() =>
  import('@/pages/AutoGradingResultsPage').then((m) => ({ default: m.AutoGradingResultsPage }))
);
const GapAnalysisDashboardPage = lazy(() =>
  import('@/pages/GapAnalysisDashboardPage').then((m) => ({ default: m.GapAnalysisDashboardPage }))
);
const StripeInvoicePage = lazy(() =>
  import('@/pages/admin/StripeInvoicePage').then((m) => ({ default: m.StripeInvoicePage }))
);
const PortalBuilderPage = lazy(() =>
  import('@/pages/PortalBuilderPage').then((m) => ({
    default: m.PortalBuilderPage,
  }))
);
const LtiSettingsPage = lazy(() =>
  import('@/pages/LtiSettingsPage').then((m) => ({
    default: m.LtiSettingsPage,
  }))
);
const ComplianceReportsPage = lazy(() =>
  import('@/pages/ComplianceReportsPage').then((m) => ({
    default: m.ComplianceReportsPage,
  }))
);
const ScimSettingsPage = lazy(() =>
  import('@/pages/ScimSettingsPage').then((m) => ({
    default: m.ScimSettingsPage,
  }))
);
const XapiSettingsPage = lazy(() =>
  import('@/pages/XapiSettingsPage').then((m) => ({
    default: m.XapiSettingsPage,
  }))
);
const AssessmentCampaignPage = lazy(() =>
  import('@/pages/AssessmentCampaignPage').then((m) => ({
    default: m.AssessmentCampaignPage,
  }))
);
const CrmSettingsPage = lazy(() =>
  import('@/pages/CrmSettingsPage').then((m) => ({
    default: m.CrmSettingsPage,
  }))
);

/**
 * Admin routes — dashboard, settings, integrations, analytics, management.
 */
export const adminRoutes: RouteObject[] = [
  { path: '/admin', element: guarded(<AdminDashboardPage />) },
  { path: '/admin/branding', element: guarded(<BrandingSettingsPage />) },
  { path: '/admin/languages', element: guarded(<LanguageSettingsPage />) },
  { path: '/admin/users', element: guarded(<UserManagementPage />) },
  { path: '/admin/roles', element: guarded(<RoleManagementPage />) },
  { path: '/admin/gamification', element: guarded(<GamificationSettingsPage />) },
  { path: '/admin/announcements', element: guarded(<AnnouncementsPage />) },
  { path: '/admin/enrollment', element: guarded(<EnrollmentManagementPage />) },
  { path: '/admin/at-risk', element: guarded(<AtRiskDashboardPage />) },
  { path: '/admin/security', element: guarded(<SecuritySettingsPage />) },
  { path: '/admin/audit', element: guarded(<AuditLogPage />) },
  { path: '/admin/audit-log', element: guarded(<AuditLogAdminPage />) },
  { path: '/admin/notifications', element: guarded(<NotificationTemplatesPage />) },
  { path: '/admin/bi-export', element: guarded(<BiExportSettingsPage />) },
  { path: '/admin/cpd', element: guarded(<CpdSettingsPage />) },
  { path: '/admin/analytics', element: guarded(<TenantAnalyticsPage />) },
  { path: '/admin/usage', element: guarded(<OrgUsagePage />) },
  { path: '/admin/platform-usage', element: guarded(<PlatformUsageDashboardPage />) },
  { path: '/admin/roi-analytics', element: guarded(<ROIAnalyticsDashboardPage />) },
  { path: '/admin/pilot-requests', element: guarded(<PilotRequestsAdminPage />) },
  // Integrations
  { path: '/admin/lti', element: guarded(<LtiSettingsPage />) },
  { path: '/admin/compliance', element: guarded(<ComplianceReportsPage />) },
  { path: '/admin/scim', element: guarded(<ScimSettingsPage />) },
  { path: '/admin/xapi', element: guarded(<XapiSettingsPage />) },
  { path: '/admin/assessments', element: guarded(<AssessmentCampaignPage />) },
  { path: '/admin/crm', element: guarded(<CrmSettingsPage />) },
  { path: '/admin/language', element: guarded(<LanguageSettingsPage />) },
  { path: '/admin/portal', element: guarded(<PortalBuilderPage />) },
  // Enterprise
  { path: '/admin/hris-config', element: guarded(<HrisConfigPage />) },
  { path: '/admin/auto-grading', element: guarded(<AutoGradingResultsPage />) },
  { path: '/admin/gap-analysis', element: guarded(<GapAnalysisDashboardPage />) },
  { path: '/admin/invoices', element: guarded(<StripeInvoicePage />) },
];

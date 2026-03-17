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

// ── Admin MVP Dashboard Pages ─────────────────────────────────────────────────
const AdminOverviewPage = lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((m) => ({
    default: m.AdminOverviewPage,
  }))
);
const AdminUserManagementPage = lazy(() =>
  import('@/pages/admin/AdminUserManagementPage').then((m) => ({
    default: m.AdminUserManagementPage,
  }))
);
const AdminRoleMatrixPage = lazy(() =>
  import('@/pages/admin/AdminRoleMatrixPage').then((m) => ({
    default: m.AdminRoleMatrixPage,
  }))
);
const AdminAuditLogPage = lazy(() =>
  import('@/pages/admin/AdminAuditLogPage').then((m) => ({
    default: m.AdminAuditLogPage,
  }))
);
const AdminAnnouncementsPage = lazy(() =>
  import('@/pages/admin/AdminAnnouncementsPage').then((m) => ({
    default: m.AdminAnnouncementsPage,
  }))
);

const ADMIN_ROLES = { requiredRoles: ['ORG_ADMIN', 'SUPER_ADMIN'] };

/**
 * Admin routes — dashboard, settings, integrations, analytics, management.
 */
export const adminRoutes: RouteObject[] = [
  { path: '/admin', element: guarded(<AdminDashboardPage />, ADMIN_ROLES) },
  { path: '/admin/branding', element: guarded(<BrandingSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/languages', element: guarded(<LanguageSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/users', element: guarded(<UserManagementPage />, ADMIN_ROLES) },
  { path: '/admin/roles', element: guarded(<RoleManagementPage />, ADMIN_ROLES) },
  { path: '/admin/gamification', element: guarded(<GamificationSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/announcements', element: guarded(<AnnouncementsPage />, ADMIN_ROLES) },
  { path: '/admin/enrollment', element: guarded(<EnrollmentManagementPage />, ADMIN_ROLES) },
  { path: '/admin/at-risk', element: guarded(<AtRiskDashboardPage />, ADMIN_ROLES) },
  { path: '/admin/security', element: guarded(<SecuritySettingsPage />, ADMIN_ROLES) },
  { path: '/admin/audit', element: guarded(<AuditLogPage />, ADMIN_ROLES) },
  { path: '/admin/audit-log', element: guarded(<AuditLogAdminPage />, ADMIN_ROLES) },
  { path: '/admin/notifications', element: guarded(<NotificationTemplatesPage />, ADMIN_ROLES) },
  { path: '/admin/bi-export', element: guarded(<BiExportSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/cpd', element: guarded(<CpdSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/analytics', element: guarded(<TenantAnalyticsPage />, ADMIN_ROLES) },
  { path: '/admin/usage', element: guarded(<OrgUsagePage />, ADMIN_ROLES) },
  { path: '/admin/platform-usage', element: guarded(<PlatformUsageDashboardPage />, ADMIN_ROLES) },
  { path: '/admin/roi-analytics', element: guarded(<ROIAnalyticsDashboardPage />, ADMIN_ROLES) },
  { path: '/admin/pilot-requests', element: guarded(<PilotRequestsAdminPage />, ADMIN_ROLES) },
  // Integrations
  { path: '/admin/lti', element: guarded(<LtiSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/compliance', element: guarded(<ComplianceReportsPage />, ADMIN_ROLES) },
  { path: '/admin/scim', element: guarded(<ScimSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/xapi', element: guarded(<XapiSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/assessments', element: guarded(<AssessmentCampaignPage />, ADMIN_ROLES) },
  { path: '/admin/crm', element: guarded(<CrmSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/language', element: guarded(<LanguageSettingsPage />, ADMIN_ROLES) },
  { path: '/admin/portal', element: guarded(<PortalBuilderPage />, ADMIN_ROLES) },
  // Enterprise
  { path: '/admin/hris-config', element: guarded(<HrisConfigPage />, ADMIN_ROLES) },
  { path: '/admin/auto-grading', element: guarded(<AutoGradingResultsPage />, ADMIN_ROLES) },
  { path: '/admin/gap-analysis', element: guarded(<GapAnalysisDashboardPage />, ADMIN_ROLES) },
  { path: '/admin/invoices', element: guarded(<StripeInvoicePage />, ADMIN_ROLES) },
  // ── Admin MVP Dashboard Pages ───────────────────────────────────────────────
  { path: '/admin/overview', element: guarded(<AdminOverviewPage />, ADMIN_ROLES) },
  { path: '/admin/user-management', element: guarded(<AdminUserManagementPage />, ADMIN_ROLES) },
  { path: '/admin/role-matrix', element: guarded(<AdminRoleMatrixPage />, ADMIN_ROLES) },
  { path: '/admin/audit-viewer', element: guarded(<AdminAuditLogPage />, ADMIN_ROLES) },
  { path: '/admin/announcements-editor', element: guarded(<AdminAnnouncementsPage />, ADMIN_ROLES) },
];

// Shared helpers
export * from './_shared';

// Core tables
export * from './tenants';
export * from './core';

// Content tables
export * from './content';
export * from './contentItems';
export * from './userCourses';
export * from './userProgress';

// Annotation tables
export * from './annotation';

// Collaboration tables
export * from './collaboration';

// Discussion tables
export * from './discussion';

// Agent tables
export * from './agent';

// Embeddings tables
export * from './embeddings';

// Translation tables
export * from './contentTranslations';

// Audit log table (GDPR Art.32 + SOC2 CC7.2)
export * from './auditLog';

// Consent table (GDPR Art.6+7 — explicit consent management)
export * from './consent';

// Retention policies (GDPR Art.5(e))
export * from './retentionPolicies';

// Tenant branding table (white-label support — G-19)
export * from './tenantBranding';

// Tenant domains table (white-label custom domains + Keycloak realm routing — G-20, G-21)
export * from './tenantDomains';

// Competency goals (F-002 Auto-Pathing)
export * from './competency';

// Spaced Repetition System cards (F-001 SRS)
export * from './srs';

// Quiz results table (F-008: Advanced Quiz Item Types)
export * from './quiz-results';

// Live sessions (F-012 Virtual Classroom — BigBlueButton)
export * from './live-sessions';

// Gamification tables (F-011 Badges, Points, Leaderboards)
export * from './gamification';

// SCORM tables (F-017)
export * from './scorm';

// Skill profiles (F-006 Skill Gap Analysis)
export * from './skill-profiles';

// Microlearning paths (F-021 Microlearning Content Type)
export * from './microlearning';

// Text submissions + plagiarism embeddings (F-005)
export * from './submissions';

// At-risk flags (F-003 Performance Risk Detection)
export * from './at-risk';

// Roleplay scenario tables (F-007 AI Role-Play Scenarios)
export * from './scenarios';

// Branching scenario progress choices (F-009)
export * from './scenario-progress';

// LTI 1.3 Provider tables (F-018)
export * from './lti';

// SCIM 2.0 tables (F-019 HRIS Auto-Enrollment)
export * from './scim';

// Certificates (F-016 Course Completion Certificates)
export * from './certificates';

// BI API tokens (F-029 BI Tool Export — Power BI / Tableau)
export * from './bi-tokens';

// Social following (F-035 Social Following System)
export * from './social';

// CPD/CE Credit Tracking (F-027)
export * from './cpd';

// xAPI / LRS Integration (F-028)
export * from './xapi';

// Stackable Credentials / Nanodegrees (F-026)
export * from './programs';

// BBB Breakout Rooms + Polls (F-034)
export * from './live-session-extensions';

// 360° Multi-Rater Assessments (F-030)
export * from './assessments';

// CRM Integration / Salesforce (F-033)
export * from './crm';

// OpenBadges 3.0 — W3C Verifiable Credentials (F-025)
export * from './open-badges';

// Instructor Marketplace + Revenue Sharing (F-031)
export * from './marketplace';

// Pre-Built Compliance Course Library (F-038)
export * from './course-library';

// No-Code Custom Portal Builder (F-037)
export * from './portal';

// Announcements (platform-wide admin messages)
export * from './announcements';

// Security settings per tenant (MFA, session, password policy, IP allowlist)
export * from './security-settings';

// Custom roles + sub-admin delegation (F-113)
export * from './custom-roles';

// Knowledge Sources — NotebookLM-style source management
export * from './knowledge-sources';

// Lesson Pipeline Builder (AI-powered lesson processing)
export * from './lesson';

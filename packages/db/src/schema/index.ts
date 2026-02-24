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

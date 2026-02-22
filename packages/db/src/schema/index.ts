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

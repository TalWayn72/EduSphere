import type enCommon from './locales/en/common.json';
import type enNav from './locales/en/nav.json';
import type enAuth from './locales/en/auth.json';
import type enDashboard from './locales/en/dashboard.json';
import type enCourses from './locales/en/courses.json';
import type enContent from './locales/en/content.json';
import type enAnnotations from './locales/en/annotations.json';
import type enAgents from './locales/en/agents.json';
import type enCollaboration from './locales/en/collaboration.json';
import type enKnowledge from './locales/en/knowledge.json';
import type enSettings from './locales/en/settings.json';
import type enErrors from './locales/en/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      nav: typeof enNav;
      auth: typeof enAuth;
      dashboard: typeof enDashboard;
      courses: typeof enCourses;
      content: typeof enContent;
      annotations: typeof enAnnotations;
      agents: typeof enAgents;
      collaboration: typeof enCollaboration;
      knowledge: typeof enKnowledge;
      settings: typeof enSettings;
      errors: typeof enErrors;
    };
  }
}

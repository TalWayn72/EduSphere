/**
 * eslint-plugin-edusphere-design-system
 *
 * Custom ESLint rules for the EduSphere Design System:
 * - no-orphan-colors: Require dark: counterparts for raw Tailwind color classes
 * - require-page-header: Require h1 heading in page components
 * - require-page-shell: Prefer <PageShell> over inline max-width containers
 */
'use strict';

const rules = require('./rules');

module.exports = {
  rules,
};

/**
 * EduSphere Design System custom ESLint rules.
 * Barrel export for all custom rules.
 */
'use strict';

module.exports = {
  'no-orphan-colors': require('./no-orphan-colors'),
  'require-page-header': require('./require-page-header'),
  'require-page-shell': require('./require-page-shell'),
};

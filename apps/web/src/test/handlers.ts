// Barrel re-export — combines all domain-specific MSW handler arrays.
// Individual handler files are in handlers-*.ts; fixtures in fixtures.ts.
import { authHandlers } from './fixtures';
import { contentHandlers } from './handlers-content';
import { annotationHandlers } from './handlers-annotation';
import { agentHandlers } from './handlers-agent';
import { searchHandlers } from './handlers-search';

export const handlers = [
  ...authHandlers,
  ...contentHandlers,
  ...annotationHandlers,
  ...agentHandlers,
  ...searchHandlers,
];

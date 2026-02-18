import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW node server (used in vitest — not browser)
export const server = setupServer(...handlers);

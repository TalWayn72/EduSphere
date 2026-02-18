// Vitest global test setup
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (prevent test pollution)
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());

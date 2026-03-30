// Vitest global test setup
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { ZodError } from 'zod';
import { server } from './server';

// ── Zod v4 -> @hookform/resolvers v3.x compatibility shim ────────────────────
// @hookform/resolvers v3.x checks `ZodError.errors` (Zod v3 property name).
// Zod v4 renamed it to `.issues`. Without this shim the resolver re-throws the
// ZodError as an unhandled rejection instead of populating form.errors.
// Adding a `.errors` getter that aliases `.issues` makes the resolver work correctly.
if (!Object.getOwnPropertyDescriptor(ZodError.prototype, 'errors')) {
  Object.defineProperty(ZodError.prototype, 'errors', {
    get(this: ZodError) {
      return this.issues;
    },
    enumerable: false,
    configurable: true,
  });
}

// ── i18n mock (real English translations) ────────────────────────────────────
import './setup-i18n-mock';

// ── Browser API stubs (matchMedia, ResizeObserver, etc.) ─────────────────────
import './setup-browser-stubs';

// ── MSW server ──────────────────────────────────────────────────────────────

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test (prevent test pollution)
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());

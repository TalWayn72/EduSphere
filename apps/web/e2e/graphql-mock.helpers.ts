/**
 * graphql-mock.helpers.ts — Shared GraphQL mock utilities for E2E tests.
 *
 * WHY THIS EXISTS:
 *   The urql client in the app POSTs to http://localhost:4000/graphql (cross-origin
 *   from the Playwright test server on port 5176). Chromium sends a CORS OPTIONS
 *   preflight before every cross-origin POST. If the mock calls `route.continue()`
 *   for OPTIONS and port 4000 is not running, chromium blocks the actual POST,
 *   causing the component to never receive its data.
 *
 *   This helper handles OPTIONS preflights with proper CORS headers and returns
 *   safe empty-data responses for unknown operations, so tests are fully self-
 *   contained with no live backend required.
 */

import type { Page, Route } from '@playwright/test';

/** CORS headers for preflight responses */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Max-Age': '86400',
};

/** Empty-data fallback response for unknown GraphQL operations */
const EMPTY_DATA_RESPONSE = JSON.stringify({ data: {} });

/**
 * Fulfill a Playwright route with CORS preflight response (OPTIONS).
 * Called automatically by routeGraphQL() for OPTIONS requests.
 */
async function fulfillCors(route: Route): Promise<void> {
  await route.fulfill({
    status: 204,
    headers: CORS_HEADERS,
    body: '',
  });
}

/**
 * Set up a page.route() interceptor that:
 *  1. Responds to OPTIONS preflights with CORS headers (fixes chromium cross-origin)
 *  2. Dispatches matched POST operations to the provided `handler`
 *  3. Returns { data: {} } for any unmatched operation (safe fallback)
 *
 * @param page   - Playwright Page object
 * @param handler - Function(operationName, rawBody) → response body string | null
 *                  Return null to use the empty-data fallback.
 */
export async function routeGraphQL(
  page: Page,
  handler: (operationName: string, body: Record<string, unknown>) => string | null,
): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request();

    // 1. Handle CORS preflight — chromium requires this for cross-origin POST
    if (request.method() === 'OPTIONS') {
      await fulfillCors(route);
      return;
    }

    // 2. Only handle POST requests
    if (request.method() !== 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: EMPTY_DATA_RESPONSE,
      });
      return;
    }

    // 3. Parse operation name from request body
    let parsed: Record<string, unknown> = {};
    try {
      parsed = (JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
    } catch {
      // Malformed body — return empty data
    }
    const operationName = (parsed.operationName as string | undefined) ?? '';

    // 4. Dispatch to handler
    const responseBody = handler(operationName, parsed);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: responseBody ?? EMPTY_DATA_RESPONSE,
    });
  });
}

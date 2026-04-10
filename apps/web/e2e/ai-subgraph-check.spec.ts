/**
 * AI Subgraph verification via browser + direct API
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.resolve(__dirname, '../../../docs/screenshots');

async function loginDevMode(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  const btn = page.getByRole('button', { name: /Sign In \(Dev Mode\)/i });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
  await page.waitForURL(/\/(dashboard|courses|learn|admin)/, { timeout: 20_000 });
}

test.describe('ai-subgraph-check', () => {
  test('AI Tutor page loads after login', async ({ page }) => {
    await loginDevMode(page);
    await page.goto('/agents');  // actual route for AI Tutor / Agent Studio
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'auth-smoke-ai-tutor.png'),
      fullPage: false,
    });
    console.log('Agents URL:', page.url());
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('agent subgraph responds to agentTemplates query', async ({ request }) => {
    // Direct API test — use valid scalar fields only (id, name)
    const response = await request.post('http://localhost:4005/graphql', {
      data: { query: '{ agentTemplates { id name } }' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    console.log('agentTemplates response status:', response.status());
    console.log('agentTemplates body:', JSON.stringify(body).slice(0, 300));
    expect(response.status()).toBe(200);
    // Returns data (may be null/empty without auth, but no 500)
    const hasDataOrErrors = 'data' in body || 'errors' in body;
    expect(hasDataOrErrors).toBe(true);
    // Must NOT be a gateway/network error
    if ('errors' in body && !('data' in body)) {
      const codes = (body.errors as Array<{extensions?: {code?: string}}>)
        .map(e => e.extensions?.code ?? 'UNKNOWN');
      // Schema validation errors mean the query was received and processed
      console.log('Error codes:', codes);
      // Acceptable: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND
      // NOT acceptable: INTERNAL_SERVER_ERROR from connection failure
      const hasNetworkError = codes.some(c => c === 'INTERNAL_SERVER_ERROR');
      expect(hasNetworkError).toBe(false);
    }
  });

  test('gateway forwards agent queries', async ({ request }) => {
    const response = await request.post('http://localhost:4000/graphql', {
      data: { query: '{ agentTemplates { id name } }' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    console.log('Gateway agentTemplates status:', response.status());
    console.log('Gateway agentTemplates body:', JSON.stringify(body).slice(0, 300));
    expect(response.status()).toBe(200);
    const hasDataOrErrors = 'data' in body || 'errors' in body;
    expect(hasDataOrErrors).toBe(true);
  });
});

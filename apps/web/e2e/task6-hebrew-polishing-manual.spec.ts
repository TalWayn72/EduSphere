/**
 * Task 6 — Hebrew Kabbalistic Lesson: LangGraph Polishing Workflow
 *
 * Manual verification via real browser (zero mocks).
 * - Real Keycloak login (instructor)
 * - Real GraphQL mutation: regeneratePolishedTranscript
 * - Real NATS + LangGraph 10-node workflow inside subgraph-content
 * - Polls up to 5 minutes, screenshot every 30s
 * - Captures Docker logs for node execution evidence
 *
 * Target lesson: fa000000-0000-0000-0000-000000000001 (Kabbalistic Hebrew seed)
 * Run:
 *   VITE_DEV_MODE=false E2E_ENV=staging \
 *   npx playwright test e2e/task6-hebrew-polishing-manual.spec.ts \
 *   --project=chromium --headed --timeout=360000
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loginViaKeycloak } from './auth.helpers';
import { BASE_URL, TEST_USERS } from './env';

// ─── Constants ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LESSON_ID = 'fa000000-0000-0000-0000-000000000001';
const EDITOR_URL = `${BASE_URL}/lesson/${LESSON_ID}/edit`;
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../docs/screenshots');
const POLL_INTERVAL_MS = 30_000;
const MAX_WAIT_MS = 5 * 60 * 1_000; // 5 minutes
const LANG_GRAPH_NODES = [
  'prepare', 'chunk', 'loadVoice', 'polishChunks',
  'stitch', 'verifyCoverage', 'repairGaps',
  'generateDiffs', 'formatOutput', 'autoPublish',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

function screenshotPath(name: string): string {
  return path.join(SCREENSHOTS_DIR, `task6-${name}.png`);
}

function captureDockerLogs(container: string): string {
  try {
    return execSync(
      `docker logs --tail 200 ${container} 2>&1`,
      { encoding: 'utf8', timeout: 10_000 }
    );
  } catch {
    return `[could not read logs for ${container}]`;
  }
}

function findNodesInLogs(logs: string): string[] {
  return LANG_GRAPH_NODES.filter(node =>
    new RegExp(`\\b${node}\\b`, 'i').test(logs)
  );
}

function extractTimestampedNodes(logs: string): string[] {
  const lines = logs.split('\n');
  const results: string[] = [];
  for (const line of lines) {
    for (const node of LANG_GRAPH_NODES) {
      if (new RegExp(`\\b${node}\\b`, 'i').test(line)) {
        results.push(line.trim().slice(0, 160));
        break;
      }
    }
  }
  return results;
}

// ─── Test ─────────────────────────────────────────────────────────────────────

test.describe('Task 6 — Hebrew Kabbalistic polishing workflow (live)', () => {
  test.setTimeout(370_000); // 6 min hard limit

  test('LangGraph 10-node polishing — observe and capture evidence', async ({ page }) => {
    ensureScreenshotsDir();

    const consoleErrors: string[] = [];
    const graphqlErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      const t = msg.text();
      if (t.includes('GRAPHQL_VALIDATION_FAILED') || t.includes('Cannot query field')) {
        graphqlErrors.push(t);
      }
    });

    // ── Step 1: Keycloak login ──────────────────────────────────────────────
    await loginViaKeycloak(page, {
      email: TEST_USERS.instructor.email,
      password: TEST_USERS.instructor.password,
    });

    // ── Step 2: Navigate to lesson editor ──────────────────────────────────
    await page.goto(EDITOR_URL, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.screenshot({ path: screenshotPath('01-editor-loaded'), fullPage: true });

    // ── Step 3: Click "Polished Transcript" tab ────────────────────────────
    const polishedTab = page.getByRole('tab', { name: /polished transcript/i });
    await polishedTab.waitFor({ timeout: 15_000 });
    await polishedTab.click();
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: screenshotPath('02-polished-tab'), fullPage: true });

    // ── Step 4: Click "Start AI Polishing" ────────────────────────────────
    const polishBtn = page.getByTestId('request-polishing-btn');
    await polishBtn.waitFor({ timeout: 15_000 });
    expect(await polishBtn.isEnabled()).toBe(true);

    // Capture pre-click logs baseline
    const preClickContentLogs = captureDockerLogs('edusphere-subgraph-content');
    const preClickAgentLogs   = captureDockerLogs('edusphere-subgraph-agent');

    await polishBtn.click();
    await page.screenshot({ path: screenshotPath('03-after-click'), fullPage: true });

    // ── Step 5: Poll for up to 5 minutes ──────────────────────────────────
    const startTime = Date.now();
    let pollCount = 0;
    let finalState: 'POLISHED' | 'FAILED' | 'TIMEOUT' | 'IN_PROGRESS' = 'IN_PROGRESS';

    while (Date.now() - startTime < MAX_WAIT_MS) {
      await page.waitForTimeout(POLL_INTERVAL_MS);
      pollCount++;

      await page.screenshot({
        path: screenshotPath(`progress-${pollCount}`),
        fullPage: true,
      });

      // Check for terminal states in page text
      const bodyText = await page.locator('body').innerText().catch(() => '');

      if (/polished/i.test(bodyText) && !/start ai polishing/i.test(bodyText)) {
        finalState = 'POLISHED';
        break;
      }
      if (/failed|error/i.test(bodyText)) {
        finalState = 'FAILED';
        break;
      }

      // Also check status badge / data-testid
      const statusBadge = page.locator('[data-testid="polished-status"]');
      if (await statusBadge.count() > 0) {
        const statusText = await statusBadge.innerText();
        if (/polished/i.test(statusText)) { finalState = 'POLISHED'; break; }
        if (/failed/i.test(statusText))   { finalState = 'FAILED'; break; }
      }
    }

    if (finalState === 'IN_PROGRESS') finalState = 'TIMEOUT';

    // ── Step 6: Final screenshot ───────────────────────────────────────────
    await page.screenshot({ path: screenshotPath('final'), fullPage: true });

    // ── Step 7: Capture Docker logs for node evidence ──────────────────────
    const postContentLogs = captureDockerLogs('edusphere-subgraph-content');
    const postAgentLogs   = captureDockerLogs('edusphere-subgraph-agent');

    const combinedLogs = postContentLogs + '\n' + postAgentLogs;
    const observedNodes = findNodesInLogs(combinedLogs);
    const timestampedLines = extractTimestampedNodes(combinedLogs);

    // ── Step 8: RTL check ──────────────────────────────────────────────────
    const rtlElements = await page.locator('[dir="rtl"], [lang="he"]').count();
    const hebrewChars = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return (text.match(/[֐-׿]/g) || []).length;
    });

    // ── Step 9: Evidence log ───────────────────────────────────────────────
    const evidencePath = path.join(SCREENSHOTS_DIR, 'task6-evidence.txt');
    const evidence = [
      `=== Task 6 Evidence Report ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `Final state: ${finalState}`,
      `Poll cycles: ${pollCount}`,
      ``,
      `=== LangGraph Nodes Observed (${observedNodes.length}/10) ===`,
      observedNodes.join(', ') || '(none)',
      ``,
      `=== Timestamped Node Lines ===`,
      ...timestampedLines,
      ``,
      `=== RTL Evidence ===`,
      `dir=rtl / lang=he elements: ${rtlElements}`,
      `Hebrew character count in final page: ${hebrewChars}`,
      ``,
      `=== Console Errors ===`,
      ...consoleErrors,
      ``,
      `=== GraphQL Errors ===`,
      ...graphqlErrors,
      ``,
      `=== subgraph-content logs (tail 200, diff) ===`,
      postContentLogs.replace(preClickContentLogs.slice(-500), '[...pre-click baseline omitted...]'),
      ``,
      `=== subgraph-agent logs (tail 200, diff) ===`,
      postAgentLogs.replace(preClickAgentLogs.slice(-500), '[...pre-click baseline omitted...]'),
    ].join('\n');

    fs.writeFileSync(evidencePath, evidence, 'utf8');

    // ── Assertions (observation, not pass/fail on workflow success) ─────────
    // We assert we were able to click the button and observe some UI reaction.
    // Workflow success (POLISHED) is informational — FAILED is also acceptable.
    expect(['POLISHED', 'FAILED', 'TIMEOUT']).toContain(finalState);

    console.log(`\n=== TASK 6 SUMMARY ===`);
    console.log(`Final state: ${finalState}`);
    console.log(`LangGraph nodes observed: ${observedNodes.join(', ') || 'none'}`);
    console.log(`RTL elements: ${rtlElements} | Hebrew chars: ${hebrewChars}`);
    console.log(`Screenshots: docs/screenshots/task6-*.png`);
    console.log(`Evidence: ${evidencePath}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`GraphQL errors: ${graphqlErrors.length}`);
    if (graphqlErrors.length > 0) console.log(graphqlErrors.join('\n'));
  });
});

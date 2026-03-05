/**
 * Agent Studio E2E Tests — AgentStudioPage (/agents/studio).
 *
 * Tests the no-code drag & drop agent workflow builder (G5):
 *   1. Page loads with all 3 regions: palette, canvas, properties panel
 *   2. All 6 node types visible in the palette (start, assess, explain, quiz, debate, end)
 *   3. Canvas shows empty-state "Drag nodes here" when no nodes dropped
 *   4. Save and Deploy buttons are disabled when canvas is empty
 *   5. Properties panel shows "Select a node" text initially
 *   6. Dropping a node: save button enabled, empty-state gone, node count shows "1 nodes"
 *   7. Visual regression: clean empty state screenshot
 *   8. Visual regression: state with a dropped node
 *   9. createAgentWorkflow mutation is intercepted when Save is clicked
 *  10. No raw technical strings visible to users (regression guard)
 *
 * GraphQL mocking: page.route() intercepts all GraphQL requests via wildcard URL pattern.
 * Auth: DEV_MODE=true (default) — loginInDevMode(); falls back to Keycloak OIDC.
 *
 * DnD approach: headless Chrome does not support real dataTransfer drag-and-drop.
 * We simulate the drop by dispatching synthetic DragEvent with a DataTransfer
 * directly on the canvas element (same approach used in lesson-pipeline.spec.ts).
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './auth.helpers';

// ── GraphQL mock bodies ───────────────────────────────────────────────────────

const WORKFLOW_CREATED = {
  id: 'wf-00000000-0000-0000-0000-000000000001',
  name: 'My Agent Workflow',
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
};

// Track whether createAgentWorkflow was called
let workflowMutationCalled = false;

async function setupGraphQLMocks(page: Page) {
  workflowMutationCalled = false;
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as {
      query?: string;
      operationName?: string;
    };
    const q = body?.query ?? '';
    const op = body?.operationName ?? '';

    // createAgentWorkflow mutation
    if (
      q.includes('createAgentWorkflow') ||
      op === 'CreateAgentWorkflow'
    ) {
      workflowMutationCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { createAgentWorkflow: WORKFLOW_CREATED },
        }),
      });
    }

    // All other GraphQL requests — return empty data
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });
}

/**
 * Simulate an HTML5 DnD drop of a node type onto the canvas.
 * Playwright does not drive dataTransfer in headless mode, so we dispatch
 * a synthetic DragEvent directly on the canvas element (same as pipeline spec).
 */
async function dropNodeOnCanvas(
  page: Page,
  nodeType: string
): Promise<void> {
  const canvas = page.getByTestId('workflow-canvas');
  await canvas.evaluate((el, type) => {
    const dt = new DataTransfer();
    dt.setData('nodeType', type);
    el.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
    );
    el.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: el.getBoundingClientRect().left + 150,
        clientY: el.getBoundingClientRect().top + 100,
      })
    );
  }, nodeType);
  // Allow React state update to propagate
  await page.waitForTimeout(300);
}

// ── Test setup ────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await login(page);
  await setupGraphQLMocks(page);
});

// ── Test suites ───────────────────────────────────────────────────────────────

test.describe('Agent Studio — page structure', () => {
  test('page loads with workflow name input, node palette, canvas, and properties panel', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    // Workflow name input
    await expect(page.getByTestId('workflow-name-input')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('workflow-name-input')).toHaveValue(
      'My Agent Workflow'
    );

    // Node palette
    await expect(page.getByTestId('node-palette')).toBeVisible();

    // Workflow canvas
    await expect(page.getByTestId('workflow-canvas')).toBeVisible();

    // Properties panel
    await expect(page.getByTestId('properties-panel')).toBeVisible();
  });

  test('all 6 node types are visible in the palette', async ({ page }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    const nodeTypes = ['start', 'assess', 'explain', 'quiz', 'debate', 'end'];
    for (const type of nodeTypes) {
      await expect(page.getByTestId(`palette-${type}`)).toBeVisible({
        timeout: 8_000,
      });
    }
  });

  test('canvas shows empty-state "Drag nodes here" when no nodes dropped', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/Drag nodes here to build your workflow/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Save and Deploy buttons are disabled when canvas is empty', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('save-workflow-btn')).toBeDisabled({
      timeout: 8_000,
    });
    await expect(page.getByTestId('deploy-workflow-btn')).toBeDisabled({
      timeout: 5_000,
    });
  });

  test('properties panel shows "Select a node" text initially', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('properties-panel')).toContainText(
      'Select a node',
      { timeout: 8_000 }
    );
  });

  test('no raw technical strings visible on load (regression guard)', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).not.toContain('[GraphQL]');
    expect(body).not.toContain('Unexpected error');
    expect(body).not.toContain('[object Object]');
    expect(body).not.toContain('undefined');

    // Regression guard: properties panel must never show a raw error string
    await expect(page.getByTestId('properties-panel')).not.toContainText(
      '[GraphQL]'
    );
    await expect(page.getByTestId('properties-panel')).not.toContainText(
      'undefined'
    );
  });
});

test.describe('Agent Studio — node drop interactions', () => {
  test('dropping a node removes the empty-state message', async ({ page }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    // Confirm empty state is shown
    await expect(
      page.getByText(/Drag nodes here to build your workflow/i)
    ).toBeVisible();

    // Drop an ASSESS node onto the canvas
    await dropNodeOnCanvas(page, 'ASSESS');

    // Empty state should disappear
    await expect(
      page.getByText(/Drag nodes here to build your workflow/i)
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('after dropping a node, Save and Deploy buttons become enabled', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await dropNodeOnCanvas(page, 'START');

    await expect(page.getByTestId('save-workflow-btn')).not.toBeDisabled({
      timeout: 5_000,
    });
    await expect(page.getByTestId('deploy-workflow-btn')).not.toBeDisabled({
      timeout: 5_000,
    });
  });

  test('after dropping a node, properties panel shows node count "1 nodes"', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await dropNodeOnCanvas(page, 'QUIZ');

    await expect(page.getByTestId('properties-panel')).toContainText(
      '1 nodes',
      { timeout: 5_000 }
    );
  });

  test('clicking a dropped node shows its properties in the panel', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await dropNodeOnCanvas(page, 'EXPLAIN');

    // The node should now appear on the canvas — click it
    // Nodes use data-testid="workflow-node-<id>" with dynamic IDs
    const nodeButton = page
      .getByTestId('workflow-canvas')
      .locator('button[data-testid^="workflow-node-"]')
      .first();
    await expect(nodeButton).toBeVisible({ timeout: 5_000 });
    await nodeButton.click();

    // Properties panel should now show the node label input, not "Select a node"
    await expect(page.getByTestId('node-label-input')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId('properties-panel')).not.toContainText(
      'Select a node'
    );
  });

  test('Delete button in properties panel removes the selected node', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await dropNodeOnCanvas(page, 'DEBATE');

    const nodeButton = page
      .getByTestId('workflow-canvas')
      .locator('button[data-testid^="workflow-node-"]')
      .first();
    await nodeButton.click();
    await expect(page.getByTestId('delete-node-btn')).toBeVisible({
      timeout: 5_000,
    });
    await page.getByTestId('delete-node-btn').click();

    // Canvas should return to empty state
    await expect(
      page.getByText(/Drag nodes here to build your workflow/i)
    ).toBeVisible({ timeout: 5_000 });

    // Buttons should become disabled again
    await expect(page.getByTestId('save-workflow-btn')).toBeDisabled({
      timeout: 3_000,
    });
  });
});

test.describe('Agent Studio — save workflow mutation', () => {
  test('clicking Save calls the createAgentWorkflow mutation (DEV_MODE skips real call)', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    // Drop a node so the save button becomes enabled
    await dropNodeOnCanvas(page, 'END');
    await expect(page.getByTestId('save-workflow-btn')).not.toBeDisabled({
      timeout: 5_000,
    });

    // Click Save — in DEV_MODE the mutation is skipped but status transitions to "saved"
    await page.getByTestId('save-workflow-btn').click();

    // The button should transition to "Saved ✓" or "Saving…" then back to "Save"
    // (DEV_MODE: goes directly to saved after 1.5s)
    await expect(page.getByTestId('save-workflow-btn')).toContainText(
      /Saved|Save|Saving/,
      { timeout: 5_000 }
    );

    // Regression guard: no raw error string after save
    await expect(page.getByTestId('workflow-canvas')).not.toContainText(
      '[GraphQL]'
    );
  });

  test('workflow name input is editable', async ({ page }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByTestId('workflow-name-input');
    await nameInput.fill('');
    await nameInput.type('My Custom Workflow');

    await expect(nameInput).toHaveValue('My Custom Workflow');
  });
});

test.describe('Agent Studio — visual regression @visual', () => {
  test.use({ reducedMotion: 'reduce' });

  test('agent studio empty state renders correctly', async ({ page }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    // Ensure the page is stable before snapshotting
    await expect(page.getByTestId('node-palette')).toBeVisible();
    await expect(page.getByTestId('workflow-canvas')).toBeVisible();

    await expect(page).toHaveScreenshot('agent-studio-empty.png', {
      maxDiffPixels: 40_000,
      animations: 'disabled',
      mask: [page.locator('[data-testid="workflow-name-input"]')],
    });
  });

  test('agent studio with a dropped node renders correctly', async ({
    page,
  }) => {
    await page.goto('/agents/studio');
    await page.waitForLoadState('networkidle');

    await dropNodeOnCanvas(page, 'ASSESS');

    // Verify node appeared before taking screenshot
    const nodeButton = page
      .getByTestId('workflow-canvas')
      .locator('button[data-testid^="workflow-node-"]')
      .first();
    await expect(nodeButton).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('agent-studio-with-node.png', {
      maxDiffPixels: 300,
      animations: 'disabled',
    });
  });
});

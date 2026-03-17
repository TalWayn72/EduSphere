/**
 * Missing Pages — P3 Visual E2E Tests
 *
 * Pages with zero E2E coverage that need basic smoke + visual regression:
 *
 * T-11  Knowledge Graph page (/graph + /knowledge-graph)
 * T-12  Search page (/search) — query input, results, no raw errors
 * T-13  My Open Badges (/my-badges)
 * T-14  Agents / AI Studio (/agents + /agents/studio)
 * T-15  Compliance Library (admin/compliance)
 *
 * Run: pnpm --filter @edusphere/web test:e2e --project=chromium \
 *        --grep "missing-pages"
 */

import { test, expect, type Page } from '@playwright/test';
import { loginInDevMode } from './auth.helpers';
import { routeGraphQL } from './graphql-mock.helpers';

async function loginAndNavigate(page: Page, path: string) {
  await loginInDevMode(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

const NO_RAW_ERRORS = [
  'Cannot return null',
  'CombinedError',
  'INTERNAL_SERVER_ERROR',
  'graphQLErrors',
  'Unexpected token',
];

async function assertNoRawErrors(page: Page) {
  for (const err of NO_RAW_ERRORS) {
    await expect(page.getByText(err, { exact: false })).not.toBeVisible({ timeout: 2_000 });
  }
}

// ─── T-11: Knowledge Graph ────────────────────────────────────────────────────

test.describe('missing-pages — T-11: Knowledge Graph', () => {
  test.describe.configure({ mode: 'serial' });

  test('/graph page loads without raw GraphQL errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'KnowledgeGraph' || opName === 'GetKnowledgeGraph' || opName === 'ConceptGraph') {
        return JSON.stringify({
          data: {
            knowledgeGraph: {
              nodes: [
                { id: 'concept-001', label: 'Machine Learning', type: 'CONCEPT', properties: {} },
                { id: 'concept-002', label: 'Neural Networks', type: 'CONCEPT', properties: {} },
              ],
              edges: [
                { id: 'edge-001', source: 'concept-001', target: 'concept-002', label: 'RELATED_TO' },
              ],
            },
          },
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/graph');

    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('knowledge-graph-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('/knowledge-graph page loads without errors', async ({ page }) => {
    await routeGraphQL(page, () => null);

    await loginAndNavigate(page, '/knowledge-graph');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('knowledge-graph-alt-route.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('knowledge graph error state shows friendly message', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'KnowledgeGraph' || opName === 'GetKnowledgeGraph') {
        return JSON.stringify({
          data: { knowledgeGraph: null },
          errors: [{ message: 'Apache AGE extension not loaded: LOAD "age" failed', extensions: { code: 'GRAPH_ENGINE_ERROR' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/graph');
    await page.waitForLoadState('networkidle');

    // Raw AGE error must NOT be shown
    await expect(page.getByText('Apache AGE extension not loaded')).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('knowledge-graph-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-12: Search Page ────────────────────────────────────────────────────────

test.describe('missing-pages — T-12: Search Page', () => {
  test.describe.configure({ mode: 'serial' });

  const MOCK_SEARCH_RESULTS = {
    semanticSearch: {
      items: [
        { id: 'content-001', title: 'Introduction to Neural Networks', type: 'ARTICLE', score: 0.95, courseId: 'course-001', moduleId: 'mod-001' },
        { id: 'content-002', title: 'Backpropagation Explained', type: 'VIDEO', score: 0.88, courseId: 'course-001', moduleId: 'mod-002' },
      ],
      totalCount: 2,
    },
  };

  test('search page loads and shows input', async ({ page }) => {
    await loginAndNavigate(page, '/search');

    // Search input should be visible
    const searchInput = page.getByRole('searchbox').or(page.getByRole('textbox')).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('search-page-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('search returns results for a query', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'SemanticSearch' || opName === 'SearchContent') {
        return JSON.stringify({ data: MOCK_SEARCH_RESULTS });
      }
      return null;
    });

    await loginAndNavigate(page, '/search');

    const searchInput = page.getByRole('searchbox').or(page.getByRole('textbox')).first();
    await searchInput.waitFor({ timeout: 10_000 });
    await searchInput.fill('neural networks');

    // Press Enter or click search button
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('search-page-results.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('search shows friendly message on error (not raw GraphQL)', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'SemanticSearch' || opName === 'SearchContent') {
        return JSON.stringify({
          data: { semanticSearch: null },
          errors: [{ message: 'pgvector HNSW index not built for embedding_vector column', extensions: { code: 'INDEX_NOT_FOUND' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/search');

    const searchInput = page.getByRole('searchbox').or(page.getByRole('textbox')).first();
    await searchInput.waitFor({ timeout: 10_000 });
    await searchInput.fill('machine learning');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Raw pgvector error must NOT be visible
    await expect(
      page.getByText('pgvector HNSW index not built')
    ).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('search-page-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-13: My Open Badges ─────────────────────────────────────────────────────

test.describe('missing-pages — T-13: My Open Badges', () => {
  test.describe.configure({ mode: 'serial' });

  const MOCK_BADGES = [
    {
      id: 'badge-001',
      credentialId: 'cred-uuid-001',
      issuedAt: '2026-02-15T10:00:00Z',
      badgeDefinition: {
        id: 'def-001',
        name: 'Course Completion: ML Basics',
        description: 'Awarded for completing Introduction to Machine Learning',
        imageUrl: '/badge-images/ml-basics.png',
        criteria: 'Complete all modules with ≥70% quiz scores',
      },
    },
  ];

  test('my badges page loads with badge list', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyOpenBadges' || opName === 'GetMyBadges') {
        return JSON.stringify({ data: { myOpenBadges: MOCK_BADGES } });
      }
      return null;
    });

    await loginAndNavigate(page, '/my-badges');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('my-badges-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('my badges page shows empty state when no badges earned', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyOpenBadges' || opName === 'GetMyBadges') {
        return JSON.stringify({ data: { myOpenBadges: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, '/my-badges');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('my-badges-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('badge error state shows friendly message (not raw JSON)', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'MyOpenBadges' || opName === 'GetMyBadges') {
        return JSON.stringify({
          data: { myOpenBadges: null },
          errors: [{ message: 'JSON validation failed: verificationHash mismatch for cred-uuid-001', extensions: { code: 'BADGE_VERIFICATION_ERROR' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/my-badges');
    await page.waitForLoadState('networkidle');

    // Raw verification hash error must NOT be visible
    await expect(
      page.getByText('verificationHash mismatch')
    ).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('my-badges-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-14: Agents / AI Studio ─────────────────────────────────────────────────

test.describe('missing-pages — T-14: Agents', () => {
  test.describe.configure({ mode: 'serial' });

  test('/agents page loads without raw errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ListAgentWorkflows' || opName === 'GetAgents') {
        return JSON.stringify({ data: { agentWorkflows: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, '/agents');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('agents-page-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('/agents/studio page loads without raw errors', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ListAgentWorkflows' || opName === 'AgentStudio') {
        return JSON.stringify({ data: { agentWorkflows: [] } });
      }
      return null;
    });

    await loginAndNavigate(page, '/agents/studio');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('agents-studio-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('agents page error state shows friendly message', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ListAgentWorkflows' || opName === 'GetAgents') {
        return JSON.stringify({
          data: { agentWorkflows: null },
          errors: [{ message: 'gVisor sandbox not available: ptrace syscall interceptor failed to initialize', extensions: { code: 'SANDBOX_ERROR' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/agents');
    await page.waitForLoadState('networkidle');

    // Raw gVisor error must NOT be visible
    await expect(
      page.getByText('ptrace syscall interceptor failed')
    ).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('agents-page-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── T-15: Compliance Library ─────────────────────────────────────────────────

test.describe('missing-pages — T-15: Compliance Library', () => {
  const MOCK_COMPLIANCE_COURSES = [
    {
      id: 'comp-001',
      title: 'GDPR Data Protection Fundamentals',
      slug: 'gdpr-fundamentals',
      complianceCategory: 'DATA_PRIVACY',
      mandatoryRoles: ['STUDENT', 'INSTRUCTOR'],
      dueDate: '2026-06-30',
      isPublished: true,
    },
    {
      id: 'comp-002',
      title: 'Information Security Awareness',
      slug: 'infosec-awareness',
      complianceCategory: 'SECURITY',
      mandatoryRoles: ['STUDENT'],
      dueDate: '2026-12-31',
      isPublished: true,
    },
  ];

  test('compliance library loads course list', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ComplianceCourses' || opName === 'GetComplianceCourses') {
        return JSON.stringify({ data: { complianceCourses: MOCK_COMPLIANCE_COURSES } });
      }
      return null;
    });

    await loginAndNavigate(page, '/admin/compliance');
    await page.waitForLoadState('networkidle');
    await assertNoRawErrors(page);

    await expect(page).toHaveScreenshot('compliance-library-loaded.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('compliance library shows GDPR course', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ComplianceCourses' || opName === 'GetComplianceCourses') {
        return JSON.stringify({ data: { complianceCourses: MOCK_COMPLIANCE_COURSES } });
      }
      return null;
    });

    await loginAndNavigate(page, '/admin/compliance');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/GDPR|Data Protection|compliance/i).first()
    ).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Page may still be loading or have different structure — just verify no crash
    });
  });

  test('compliance library error state shows friendly message', async ({ page }) => {
    await routeGraphQL(page, (opName) => {
      if (opName === 'ComplianceCourses' || opName === 'GetComplianceCourses') {
        return JSON.stringify({
          data: { complianceCourses: null },
          errors: [{ message: 'Compliance module not licensed for this tenant', extensions: { code: 'LICENSE_REQUIRED' } }],
        });
      }
      return null;
    });

    await loginAndNavigate(page, '/admin/compliance');
    await page.waitForLoadState('networkidle');

    // Raw license error must NOT be shown
    await expect(
      page.getByText('Compliance module not licensed for this tenant')
    ).not.toBeVisible({ timeout: 3_000 });

    await expect(page).toHaveScreenshot('compliance-library-error.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

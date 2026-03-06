import { test, expect } from '@playwright/test';

/**
 * Phase 32 — Real-time AI Subtitle Translation E2E tests.
 *
 * Tests the VideoSubtitleSelector integration in the lesson player.
 * Route: /courses/:courseId/lessons/:lessonId
 *
 * These tests mock the GraphQL `mediaAsset` query to return subtitle tracks,
 * simulating the state AFTER AI translation has completed for a media asset.
 */

const LESSON_URL = '/courses/course-1/lessons/lesson-1';

const MOCK_SUBTITLE_TRACKS = [
  {
    language: 'he',
    label: 'Hebrew',
    src: '/fixtures/he.vtt',
    __typename: 'SubtitleTrack',
  },
  {
    language: 'fr',
    label: 'French',
    src: '/fixtures/fr.vtt',
    __typename: 'SubtitleTrack',
  },
];

const MOCK_MEDIA_WITH_SUBTITLES = {
  data: {
    lesson: {
      id: 'lesson-1',
      title: 'Test Lesson',
      mediaAsset: {
        id: 'asset-1',
        downloadUrl: 'https://example.com/video.mp4',
        hlsManifestUrl: null,
        subtitleTracks: MOCK_SUBTITLE_TRACKS,
        __typename: 'MediaAsset',
      },
      __typename: 'Lesson',
    },
  },
};

const MOCK_MEDIA_WITHOUT_SUBTITLES = {
  data: {
    lesson: {
      id: 'lesson-1',
      title: 'Test Lesson',
      mediaAsset: {
        id: 'asset-1',
        downloadUrl: 'https://example.com/video.mp4',
        hlsManifestUrl: null,
        subtitleTracks: [],
        __typename: 'MediaAsset',
      },
      __typename: 'Lesson',
    },
  },
};

test.describe('Subtitle Tracks — Phase 32', () => {
  test('no CC button when media has no subtitle tracks', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITHOUT_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="subtitle-selector-btn"]')
    ).not.toBeVisible();
  });

  test('CC button appears when subtitle tracks are available', async ({
    page,
  }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    // Hover over video to show controls
    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});

    await expect(
      page.locator('[data-testid="subtitle-selector-btn"]')
    ).toBeVisible();
  });

  test('clicking CC button opens subtitle language menu', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();
    await expect(page.locator('[data-testid="subtitle-menu"]')).toBeVisible();
  });

  test('subtitle menu shows all available languages', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();

    await expect(
      page.locator('[data-testid="subtitle-lang-he"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="subtitle-lang-fr"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="subtitle-lang-he"]')
    ).toContainText('Hebrew');
    await expect(
      page.locator('[data-testid="subtitle-lang-fr"]')
    ).toContainText('French');
  });

  test('selecting a subtitle language marks it as active', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();
    await page.locator('[data-testid="subtitle-lang-he"]').click();

    await expect(
      page.locator('[data-testid="subtitle-lang-he"]')
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.locator('[data-testid="subtitle-lang-fr"]')
    ).toHaveAttribute('aria-selected', 'false');
  });

  test('subtitle menu includes Off option to disable captions', async ({
    page,
  }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();

    await expect(page.locator('[data-testid="subtitle-off"]')).toBeVisible();
  });

  test('raw technical strings are NOT shown to users', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('[Network Error]');
    expect(bodyText).not.toContain('GraphQL error');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('Cannot read properties');
  });

  // ── Visual regression ──────────────────────────────────────────────────────

  test('subtitle selector closed state — visual regression', async ({
    page,
  }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});

    await expect(page).toHaveScreenshot('subtitle-selector-closed.png');
  });

  test('subtitle selector open state — visual regression', async ({ page }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();

    await expect(page).toHaveScreenshot('subtitle-selector-open.png');
  });

  test('active subtitle language selected state — visual regression', async ({
    page,
  }) => {
    await page.route('**/graphql', (route) => {
      const body = route.request().postDataJSON() as { query: string };
      if (
        body.query?.includes('lesson') ||
        body.query?.includes('mediaAsset')
      ) {
        return route.fulfill({ json: MOCK_MEDIA_WITH_SUBTITLES });
      }
      return route.continue();
    });

    await page.goto(LESSON_URL);
    await page.waitForLoadState('networkidle');

    await page
      .locator('video, [data-testid="video-player"]')
      .hover()
      .catch(() => {});
    await page.locator('[data-testid="subtitle-selector-btn"]').click();
    await page.locator('[data-testid="subtitle-lang-he"]').click();

    await expect(page).toHaveScreenshot('subtitle-lang-selected.png');
  });
});

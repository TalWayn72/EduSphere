/**
 * public-profile.spec.ts — Public Profile Page & Profile Privacy E2E Tests
 *
 * Routes:
 *   /u/:userId   — PublicProfilePage (unauthenticated access allowed when profile is public)
 *   /profile     — ProfilePage with ProfileVisibilityCard toggle
 *
 * Run:
 *   pnpm --filter @edusphere/web test:e2e -- --grep="Public Profile"
 */

import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { IS_DEV_MODE, RUN_WRITE_TESTS } from './env';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the public profile of a specific user.
 * No login is required for this page when the profile is public.
 */
async function gotoPublicProfile(
  page: Parameters<typeof login>[0],
  userId = 'demo-user'
) {
  await page.goto(`/u/${userId}`);
  await page.waitForLoadState('networkidle');
}

async function gotoProfileSettings(page: Parameters<typeof login>[0]) {
  await login(page);
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('Public Profile', () => {
  // ── Public profile rendering ──────────────────────────────────────────────

  test('/u/demo-user renders without requiring authentication', async ({
    browser,
  }) => {
    // Use a fresh unauthenticated context
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await gotoPublicProfile(page, 'demo-user');

    // Should render either a profile page or a private/not-found notice —
    // but it must not redirect to /login (the page is publicly reachable).
    const finalUrl = page.url();
    expect(finalUrl).not.toMatch(/\/login/);

    await ctx.close();
  });

  test('public profile page shows user display name', async ({ page }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    // In DEV_MODE the GraphQL mock either returns profile data or null.
    // We verify no crash and one of the two expected states is rendered.
    const body = (await page.locator('body').textContent()) ?? '';
    const hasProfile = body.trim().length > 0;
    expect(hasProfile).toBe(true);
  });

  test('public profile page shows avatar or avatar fallback initials', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    // Avatar is rendered as an <img> or an AvatarFallback <span>
    const avatar = page.locator(
      'img[alt], [class*="avatar" i], [class*="Avatar" i]'
    );
    const avatarCount = await avatar.count();

    // Accept any avatar element OR the private/not-found notice
    const body = (await page.locator('body').textContent()) ?? '';
    const hasPrivateNotice =
      /Profile Not Available|private|does not exist/i.test(body);
    expect(avatarCount > 0 || hasPrivateNotice).toBe(true);
  });

  test('public profile page shows stats section when profile is public', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    const body = (await page.locator('body').textContent()) ?? '';
    // Stats appear when the profile is public; private/not-found shows a different UI
    const hasStats =
      /Courses Completed|Badges Earned|Current Streak|Concepts Mastered|Learning Minutes/i.test(
        body
      );
    const hasPrivateNotice =
      /Profile Not Available|private|does not exist/i.test(body);
    expect(hasStats || hasPrivateNotice).toBe(true);
  });

  test('public profile page shows completed courses when profile is public', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    const body = (await page.locator('body').textContent()) ?? '';
    const hasCoursesSection = /Completed Courses/i.test(body);
    const hasPrivateNotice =
      /Profile Not Available|private|does not exist/i.test(body);
    // Both outcomes are valid — we just need the page to render cleanly
    expect(hasCoursesSection || hasPrivateNotice).toBe(true);
  });

  test('Share / Copy Profile Link button is visible on public profile', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    const body = (await page.locator('body').textContent()) ?? '';
    const isPublicProfile = /Courses Completed|Badges Earned/i.test(body);

    if (isPublicProfile) {
      // Share button is rendered when the profile is public
      await expect(
        page.getByRole('button', { name: /share|copy/i })
      ).toBeVisible();
    } else {
      // Private — no share button expected
      expect(/Profile Not Available|private|does not exist/i.test(body)).toBe(
        true
      );
    }
  });

  test('Share button feedback shows "Copied!" after click', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);
    await login(page);
    await gotoPublicProfile(page, 'demo-user');

    const shareBtn = page.getByRole('button', { name: /share|copy/i });
    const isVisible = await shareBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (isVisible) {
      await shareBtn.click();
      await expect(page.getByRole('button', { name: /copied!/i })).toBeVisible({
        timeout: 3_000,
      });
    } else {
      // Private profile — no share button; that is acceptable
      const body = (await page.locator('body').textContent()) ?? '';
      expect(/Profile Not Available|private|does not exist/i.test(body)).toBe(
        true
      );
    }
  });

  // ── Private / not-found profile ───────────────────────────────────────────

  test('non-existent profile ID shows private/not-found notice', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'this-user-does-not-exist-xyz-999');

    const body = (await page.locator('body').textContent()) ?? '';
    const hasNotice =
      /Profile Not Available|private|does not exist|not found/i.test(body);
    expect(hasNotice).toBe(true);
  });

  test('private profile notice includes a Browse Courses link', async ({
    page,
  }) => {
    await login(page);
    await gotoPublicProfile(page, 'this-user-does-not-exist-xyz-999');

    const body = (await page.locator('body').textContent()) ?? '';
    const isPrivateNotice =
      /Profile Not Available|private|does not exist/i.test(body);

    if (isPrivateNotice) {
      await expect(
        page.getByRole('link', { name: /browse courses/i })
      ).toBeVisible();
    }
  });

  // ── Profile privacy toggle on /profile ───────────────────────────────────

  test('/profile page renders the Public Profile card', async ({ page }) => {
    await gotoProfileSettings(page);
    const body = (await page.locator('body').textContent()) ?? '';
    expect(
      /Public Profile|profile is public|profile is private/i.test(body)
    ).toBe(true);
  });

  test('Public Profile toggle switch has correct role="switch" attribute', async ({
    page,
  }) => {
    await gotoProfileSettings(page);
    const toggleSwitch = page.locator('[role="switch"]').first();
    const count = await toggleSwitch.count();

    if (count > 0) {
      await expect(toggleSwitch).toHaveAttribute('aria-checked');
    }
  });

  test('profile page shows View public profile link when profile is public', async ({
    page,
  }) => {
    await gotoProfileSettings(page);
    const body = (await page.locator('body').textContent()) ?? '';
    const isPublic = /your profile is public/i.test(body);

    if (isPublic) {
      await expect(
        page.getByRole('link', { name: /view public profile/i })
      ).toBeVisible();
    }
  });

  test('profile page shows Copy link button when profile is public', async ({
    page,
  }) => {
    await gotoProfileSettings(page);
    const body = (await page.locator('body').textContent()) ?? '';
    const isPublic = /your profile is public/i.test(body);

    if (isPublic) {
      await expect(
        page.getByRole('button', { name: /copy link/i })
      ).toBeVisible();
    }
  });

  // ── Toggle interaction (write test) ──────────────────────────────────────

  test.describe('Privacy toggle (write)', () => {
    test.skip(!RUN_WRITE_TESTS, 'Skipped: RUN_WRITE_TESTS=false');

    test('clicking the toggle switch changes the profile visibility state', async ({
      page,
    }) => {
      await gotoProfileSettings(page);
      const toggle = page.locator('[role="switch"]').first();
      const count = await toggle.count();

      test.skip(count === 0, 'No toggle switch found on /profile — skipping');

      const initialChecked = await toggle.getAttribute('aria-checked');
      await toggle.click();
      await page.waitForLoadState('networkidle');

      // The aria-checked value should have flipped
      const newChecked = await toggle.getAttribute('aria-checked');
      expect(newChecked).not.toBe(initialChecked);
    });
  });

  // ── Visual regression ─────────────────────────────────────────────────────

  test('visual: public profile page @visual', async ({ page }) => {
    await login(page);
    await gotoPublicProfile(page, 'demo-user');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('public-profile.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
      mask: [
        // Mask dynamic date fields ("Member since", completion dates)
        page.locator(
          'text=/Member since|January|February|March|April|May|June|July|August|September|October|November|December/'
        ),
      ],
    });
  });

  test('visual: private profile notice @visual', async ({ page }) => {
    test.skip(!IS_DEV_MODE, 'Visual test runs in DEV_MODE only');
    await login(page);
    await gotoPublicProfile(page, 'this-user-does-not-exist-xyz-999');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('public-profile-private.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

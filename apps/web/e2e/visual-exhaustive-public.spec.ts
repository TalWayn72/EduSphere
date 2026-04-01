import { test, expect, type Page, type Locator } from '@playwright/test';
import { STABLE_OPTS } from './helpers/visual-test-utils';
import { BASE_URL } from './env';

test.use({ reducedMotion: 'reduce' });
const BASE = BASE_URL;
const EO = { animations: 'disabled' as const };

async function prep(page: Page, path: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function elOrPage(page: Page, sel: string): Promise<Page | Locator> {
  const el = page.locator(sel).first();
  return (await el.isVisible({ timeout: 3000 }).catch(() => false)) ? el : page;
}

const H = 'header, nav, [data-testid="header"]';
const M =
  '.hero, [data-testid="hero"], main > section:first-of-type, main > div:first-child';
const F = 'footer, [role="contentinfo"], [data-testid="footer"]';

// ── Landing (/) ─────────────────────────────────────────────────────────────
test.describe('Exhaustive Public — Landing', () => {
  test.setTimeout(60_000);
  test('landing desktop full', async ({ page }) => {
    await prep(page, '/', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-landing-d-full.png',
      STABLE_OPTS
    );
  });
  test('landing tablet full', async ({ page }) => {
    await prep(page, '/', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-landing-t-full.png',
      STABLE_OPTS
    );
  });
  test('landing mobile full', async ({ page }) => {
    await prep(page, '/', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-landing-m-full.png',
      STABLE_OPTS
    );
  });
  test('landing wide full', async ({ page }) => {
    await prep(page, '/', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-landing-w-full.png',
      STABLE_OPTS
    );
  });
  test('landing desktop header', async ({ page }) => {
    await prep(page, '/', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-landing-d-header.png',
      EO
    );
  });
  test('landing mobile header', async ({ page }) => {
    await prep(page, '/', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-landing-m-header.png',
      EO
    );
  });
  test('landing desktop hero', async ({ page }) => {
    await prep(page, '/', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-landing-d-hero.png',
      EO
    );
  });
  test('landing mobile hero', async ({ page }) => {
    await prep(page, '/', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-landing-m-hero.png',
      EO
    );
  });
  test('landing desktop footer', async ({ page }) => {
    await prep(page, '/', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-landing-d-footer.png',
      EO
    );
  });
  test('landing mobile footer', async ({ page }) => {
    await prep(page, '/', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-landing-m-footer.png',
      EO
    );
  });
});

// ── Login (/login) ──────────────────────────────────────────────────────────
test.describe('Exhaustive Public — Login', () => {
  test.setTimeout(60_000);
  test('login desktop full', async ({ page }) => {
    await prep(page, '/login', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-login-d-full.png',
      STABLE_OPTS
    );
  });
  test('login tablet full', async ({ page }) => {
    await prep(page, '/login', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-login-t-full.png',
      STABLE_OPTS
    );
  });
  test('login mobile full', async ({ page }) => {
    await prep(page, '/login', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-login-m-full.png',
      STABLE_OPTS
    );
  });
  test('login wide full', async ({ page }) => {
    await prep(page, '/login', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-login-w-full.png',
      STABLE_OPTS
    );
  });
  test('login desktop header', async ({ page }) => {
    await prep(page, '/login', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-login-d-header.png',
      EO
    );
  });
  test('login mobile header', async ({ page }) => {
    await prep(page, '/login', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-login-m-header.png',
      EO
    );
  });
  test('login desktop hero', async ({ page }) => {
    await prep(page, '/login', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-login-d-hero.png',
      EO
    );
  });
  test('login mobile hero', async ({ page }) => {
    await prep(page, '/login', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-login-m-hero.png',
      EO
    );
  });
  test('login desktop footer', async ({ page }) => {
    await prep(page, '/login', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-login-d-footer.png',
      EO
    );
  });
  test('login mobile footer', async ({ page }) => {
    await prep(page, '/login', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-login-m-footer.png',
      EO
    );
  });
});

// ── About (/about) ──────────────────────────────────────────────────────────
test.describe('Exhaustive Public — About', () => {
  test.setTimeout(60_000);
  test('about desktop full', async ({ page }) => {
    await prep(page, '/about', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-about-d-full.png',
      STABLE_OPTS
    );
  });
  test('about tablet full', async ({ page }) => {
    await prep(page, '/about', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-about-t-full.png',
      STABLE_OPTS
    );
  });
  test('about mobile full', async ({ page }) => {
    await prep(page, '/about', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-about-m-full.png',
      STABLE_OPTS
    );
  });
  test('about wide full', async ({ page }) => {
    await prep(page, '/about', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-about-w-full.png',
      STABLE_OPTS
    );
  });
  test('about desktop header', async ({ page }) => {
    await prep(page, '/about', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-about-d-header.png',
      EO
    );
  });
  test('about mobile header', async ({ page }) => {
    await prep(page, '/about', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-about-m-header.png',
      EO
    );
  });
  test('about desktop hero', async ({ page }) => {
    await prep(page, '/about', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-about-d-hero.png',
      EO
    );
  });
  test('about mobile hero', async ({ page }) => {
    await prep(page, '/about', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-about-m-hero.png',
      EO
    );
  });
  test('about desktop footer', async ({ page }) => {
    await prep(page, '/about', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-about-d-footer.png',
      EO
    );
  });
  test('about mobile footer', async ({ page }) => {
    await prep(page, '/about', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-about-m-footer.png',
      EO
    );
  });
});

// ── Pricing (/pricing) ─────────────────────────────────────────────────────
test.describe('Exhaustive Public — Pricing', () => {
  test.setTimeout(60_000);
  test('pricing desktop full', async ({ page }) => {
    await prep(page, '/pricing', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-pricing-d-full.png',
      STABLE_OPTS
    );
  });
  test('pricing tablet full', async ({ page }) => {
    await prep(page, '/pricing', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-pricing-t-full.png',
      STABLE_OPTS
    );
  });
  test('pricing mobile full', async ({ page }) => {
    await prep(page, '/pricing', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-pricing-m-full.png',
      STABLE_OPTS
    );
  });
  test('pricing wide full', async ({ page }) => {
    await prep(page, '/pricing', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-pricing-w-full.png',
      STABLE_OPTS
    );
  });
  test('pricing desktop header', async ({ page }) => {
    await prep(page, '/pricing', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-pricing-d-header.png',
      EO
    );
  });
  test('pricing mobile header', async ({ page }) => {
    await prep(page, '/pricing', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-pricing-m-header.png',
      EO
    );
  });
  test('pricing desktop hero', async ({ page }) => {
    await prep(page, '/pricing', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-pricing-d-hero.png',
      EO
    );
  });
  test('pricing mobile hero', async ({ page }) => {
    await prep(page, '/pricing', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-pricing-m-hero.png',
      EO
    );
  });
  test('pricing desktop footer', async ({ page }) => {
    await prep(page, '/pricing', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-pricing-d-footer.png',
      EO
    );
  });
  test('pricing mobile footer', async ({ page }) => {
    await prep(page, '/pricing', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-pricing-m-footer.png',
      EO
    );
  });
});

// ── Features (/features) ───────────────────────────────────────────────────
test.describe('Exhaustive Public — Features', () => {
  test.setTimeout(60_000);
  test('features desktop full', async ({ page }) => {
    await prep(page, '/features', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-features-d-full.png',
      STABLE_OPTS
    );
  });
  test('features tablet full', async ({ page }) => {
    await prep(page, '/features', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-features-t-full.png',
      STABLE_OPTS
    );
  });
  test('features mobile full', async ({ page }) => {
    await prep(page, '/features', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-features-m-full.png',
      STABLE_OPTS
    );
  });
  test('features wide full', async ({ page }) => {
    await prep(page, '/features', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-features-w-full.png',
      STABLE_OPTS
    );
  });
  test('features desktop header', async ({ page }) => {
    await prep(page, '/features', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-features-d-header.png',
      EO
    );
  });
  test('features mobile header', async ({ page }) => {
    await prep(page, '/features', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-features-m-header.png',
      EO
    );
  });
  test('features desktop hero', async ({ page }) => {
    await prep(page, '/features', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-features-d-hero.png',
      EO
    );
  });
  test('features mobile hero', async ({ page }) => {
    await prep(page, '/features', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-features-m-hero.png',
      EO
    );
  });
  test('features desktop footer', async ({ page }) => {
    await prep(page, '/features', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-features-d-footer.png',
      EO
    );
  });
  test('features mobile footer', async ({ page }) => {
    await prep(page, '/features', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-features-m-footer.png',
      EO
    );
  });
});

// ── Help (/help) ────────────────────────────────────────────────────────────
test.describe('Exhaustive Public — Help', () => {
  test.setTimeout(60_000);
  test('help desktop full', async ({ page }) => {
    await prep(page, '/help', 1280, 720);
    await expect(page).toHaveScreenshot('exh-pub-help-d-full.png', STABLE_OPTS);
  });
  test('help tablet full', async ({ page }) => {
    await prep(page, '/help', 768, 1024);
    await expect(page).toHaveScreenshot('exh-pub-help-t-full.png', STABLE_OPTS);
  });
  test('help mobile full', async ({ page }) => {
    await prep(page, '/help', 375, 812);
    await expect(page).toHaveScreenshot('exh-pub-help-m-full.png', STABLE_OPTS);
  });
  test('help wide full', async ({ page }) => {
    await prep(page, '/help', 1920, 1080);
    await expect(page).toHaveScreenshot('exh-pub-help-w-full.png', STABLE_OPTS);
  });
  test('help desktop header', async ({ page }) => {
    await prep(page, '/help', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-help-d-header.png',
      EO
    );
  });
  test('help mobile header', async ({ page }) => {
    await prep(page, '/help', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-help-m-header.png',
      EO
    );
  });
  test('help desktop hero', async ({ page }) => {
    await prep(page, '/help', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-help-d-hero.png',
      EO
    );
  });
  test('help mobile hero', async ({ page }) => {
    await prep(page, '/help', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-help-m-hero.png',
      EO
    );
  });
  test('help desktop footer', async ({ page }) => {
    await prep(page, '/help', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-help-d-footer.png',
      EO
    );
  });
  test('help mobile footer', async ({ page }) => {
    await prep(page, '/help', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-help-m-footer.png',
      EO
    );
  });
});

// ── FAQ (/faq) ──────────────────────────────────────────────────────────────
test.describe('Exhaustive Public — FAQ', () => {
  test.setTimeout(60_000);
  test('faq desktop full', async ({ page }) => {
    await prep(page, '/faq', 1280, 720);
    await expect(page).toHaveScreenshot('exh-pub-faq-d-full.png', STABLE_OPTS);
  });
  test('faq tablet full', async ({ page }) => {
    await prep(page, '/faq', 768, 1024);
    await expect(page).toHaveScreenshot('exh-pub-faq-t-full.png', STABLE_OPTS);
  });
  test('faq mobile full', async ({ page }) => {
    await prep(page, '/faq', 375, 812);
    await expect(page).toHaveScreenshot('exh-pub-faq-m-full.png', STABLE_OPTS);
  });
  test('faq wide full', async ({ page }) => {
    await prep(page, '/faq', 1920, 1080);
    await expect(page).toHaveScreenshot('exh-pub-faq-w-full.png', STABLE_OPTS);
  });
  test('faq desktop header', async ({ page }) => {
    await prep(page, '/faq', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-faq-d-header.png',
      EO
    );
  });
  test('faq mobile header', async ({ page }) => {
    await prep(page, '/faq', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-faq-m-header.png',
      EO
    );
  });
  test('faq desktop hero', async ({ page }) => {
    await prep(page, '/faq', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-faq-d-hero.png',
      EO
    );
  });
  test('faq mobile hero', async ({ page }) => {
    await prep(page, '/faq', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-faq-m-hero.png',
      EO
    );
  });
  test('faq desktop footer', async ({ page }) => {
    await prep(page, '/faq', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-faq-d-footer.png',
      EO
    );
  });
  test('faq mobile footer', async ({ page }) => {
    await prep(page, '/faq', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-faq-m-footer.png',
      EO
    );
  });
});

// ── Terms (/terms) ──────────────────────────────────────────────────────────
test.describe('Exhaustive Public — Terms', () => {
  test.setTimeout(60_000);
  test('terms desktop full', async ({ page }) => {
    await prep(page, '/terms', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-terms-d-full.png',
      STABLE_OPTS
    );
  });
  test('terms tablet full', async ({ page }) => {
    await prep(page, '/terms', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-terms-t-full.png',
      STABLE_OPTS
    );
  });
  test('terms mobile full', async ({ page }) => {
    await prep(page, '/terms', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-terms-m-full.png',
      STABLE_OPTS
    );
  });
  test('terms wide full', async ({ page }) => {
    await prep(page, '/terms', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-terms-w-full.png',
      STABLE_OPTS
    );
  });
  test('terms desktop header', async ({ page }) => {
    await prep(page, '/terms', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-terms-d-header.png',
      EO
    );
  });
  test('terms mobile header', async ({ page }) => {
    await prep(page, '/terms', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-terms-m-header.png',
      EO
    );
  });
  test('terms desktop hero', async ({ page }) => {
    await prep(page, '/terms', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-terms-d-hero.png',
      EO
    );
  });
  test('terms mobile hero', async ({ page }) => {
    await prep(page, '/terms', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-terms-m-hero.png',
      EO
    );
  });
  test('terms desktop footer', async ({ page }) => {
    await prep(page, '/terms', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-terms-d-footer.png',
      EO
    );
  });
  test('terms mobile footer', async ({ page }) => {
    await prep(page, '/terms', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-terms-m-footer.png',
      EO
    );
  });
});

// ── Privacy (/privacy) ─────────────────────────────────────────────────────
test.describe('Exhaustive Public — Privacy', () => {
  test.setTimeout(60_000);
  test('privacy desktop full', async ({ page }) => {
    await prep(page, '/privacy', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-privacy-d-full.png',
      STABLE_OPTS
    );
  });
  test('privacy tablet full', async ({ page }) => {
    await prep(page, '/privacy', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-privacy-t-full.png',
      STABLE_OPTS
    );
  });
  test('privacy mobile full', async ({ page }) => {
    await prep(page, '/privacy', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-privacy-m-full.png',
      STABLE_OPTS
    );
  });
  test('privacy wide full', async ({ page }) => {
    await prep(page, '/privacy', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-privacy-w-full.png',
      STABLE_OPTS
    );
  });
  test('privacy desktop header', async ({ page }) => {
    await prep(page, '/privacy', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-privacy-d-header.png',
      EO
    );
  });
  test('privacy mobile header', async ({ page }) => {
    await prep(page, '/privacy', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-privacy-m-header.png',
      EO
    );
  });
  test('privacy desktop hero', async ({ page }) => {
    await prep(page, '/privacy', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-privacy-d-hero.png',
      EO
    );
  });
  test('privacy mobile hero', async ({ page }) => {
    await prep(page, '/privacy', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-privacy-m-hero.png',
      EO
    );
  });
  test('privacy desktop footer', async ({ page }) => {
    await prep(page, '/privacy', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-privacy-d-footer.png',
      EO
    );
  });
  test('privacy mobile footer', async ({ page }) => {
    await prep(page, '/privacy', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-privacy-m-footer.png',
      EO
    );
  });
});

// ── Contact (/contact) ─────────────────────────────────────────────────────
test.describe('Exhaustive Public — Contact', () => {
  test.setTimeout(60_000);
  test('contact desktop full', async ({ page }) => {
    await prep(page, '/contact', 1280, 720);
    await expect(page).toHaveScreenshot(
      'exh-pub-contact-d-full.png',
      STABLE_OPTS
    );
  });
  test('contact tablet full', async ({ page }) => {
    await prep(page, '/contact', 768, 1024);
    await expect(page).toHaveScreenshot(
      'exh-pub-contact-t-full.png',
      STABLE_OPTS
    );
  });
  test('contact mobile full', async ({ page }) => {
    await prep(page, '/contact', 375, 812);
    await expect(page).toHaveScreenshot(
      'exh-pub-contact-m-full.png',
      STABLE_OPTS
    );
  });
  test('contact wide full', async ({ page }) => {
    await prep(page, '/contact', 1920, 1080);
    await expect(page).toHaveScreenshot(
      'exh-pub-contact-w-full.png',
      STABLE_OPTS
    );
  });
  test('contact desktop header', async ({ page }) => {
    await prep(page, '/contact', 1280, 720);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-contact-d-header.png',
      EO
    );
  });
  test('contact mobile header', async ({ page }) => {
    await prep(page, '/contact', 375, 812);
    await expect(await elOrPage(page, H)).toHaveScreenshot(
      'exh-pub-contact-m-header.png',
      EO
    );
  });
  test('contact desktop hero', async ({ page }) => {
    await prep(page, '/contact', 1280, 720);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-contact-d-hero.png',
      EO
    );
  });
  test('contact mobile hero', async ({ page }) => {
    await prep(page, '/contact', 375, 812);
    await expect(await elOrPage(page, M)).toHaveScreenshot(
      'exh-pub-contact-m-hero.png',
      EO
    );
  });
  test('contact desktop footer', async ({ page }) => {
    await prep(page, '/contact', 1280, 720);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-contact-d-footer.png',
      EO
    );
  });
  test('contact mobile footer', async ({ page }) => {
    await prep(page, '/contact', 375, 812);
    await expect(await elOrPage(page, F)).toHaveScreenshot(
      'exh-pub-contact-m-footer.png',
      EO
    );
  });
});

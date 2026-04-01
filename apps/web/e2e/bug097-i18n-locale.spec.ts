import { test, expect } from '@playwright/test';

test.describe('BUG-097: i18n locale preference', () => {
  test.beforeEach(async ({ page }) => {
    // Set Hebrew locale before navigating
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('i18nextLng', 'he');
    });
  });

  test('landing page shows Hebrew content when locale is Hebrew', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Verify RTL direction
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');

    // Verify lang attribute
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('he');

    // Verify Hebrew content exists (check for Hebrew characters)
    const bodyText = await page.textContent('body');
    const hebrewChars = (bodyText?.match(/[\u0590-\u05FF]/g) || []).length;
    expect(hebrewChars).toBeGreaterThan(50);

    // Verify common hardcoded English strings are NOT present
    expect(bodyText).not.toContain('Request Demo');
    expect(bodyText).not.toContain('Start Free Pilot');
    expect(bodyText).not.toContain('No credit card required');
  });

  test('login page shows Hebrew content', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    const hebrewChars = (bodyText?.match(/[\u0590-\u05FF]/g) || []).length;
    expect(hebrewChars).toBeGreaterThan(10);

    // Should NOT show English "Sign In" button
    // (may show Hebrew equivalent "כניסה")
    expect(bodyText).not.toContain('Sign In (Dev Mode)');
  });

  test('features page shows Hebrew content', async ({ page }) => {
    await page.goto('http://localhost:5173/features');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');
    const hebrewChars = (bodyText?.match(/[\u0590-\u05FF]/g) || []).length;
    expect(hebrewChars).toBeGreaterThan(30);
  });

  test('English locale shows English content', async ({ page }) => {
    // Override to English
    await page.evaluate(() => {
      localStorage.setItem('edusphere_locale', 'en');
      localStorage.setItem('i18nextLng', 'en');
    });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('ltr');

    const bodyText = await page.textContent('body');
    const latinChars = (bodyText?.match(/[a-zA-Z]/g) || []).length;
    expect(latinChars).toBeGreaterThan(50);
  });
});

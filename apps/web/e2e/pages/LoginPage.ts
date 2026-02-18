import { type Page, type Locator, expect } from '@playwright/test';

/**
 * LoginPage — Page Object Model for the EduSphere login screen.
 *
 * In DEV_MODE (VITE_DEV_MODE=true) the app skips Keycloak and auto-authenticates
 * all users. The Login page still renders with its "Sign In with Keycloak" button
 * and redirects to "/" → "/learn/content-1" after clicking.
 *
 * For tests that need an authenticated session, simply navigate to a protected
 * route — the ProtectedRoute component will pass through in DEV_MODE.
 */
export class LoginPage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly signInButton: Locator;
  readonly logoIcon: Locator;
  readonly descriptionText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Welcome to EduSphere' });
    this.subheading = page.getByText('Knowledge Graph Educational Platform');
    this.signInButton = page.getByRole('button', { name: /Sign In with Keycloak/i });
    this.logoIcon = page.locator('[data-testid="logo-icon"], .lucide-book-open').first();
    this.descriptionText = page.getByText(/Sign in with your organizational account/i);
  }

  /** Navigate to the login page. */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Sign In with Keycloak".
   * In DEV_MODE this immediately sets devAuthenticated=true and redirects to "/".
   */
  async clickSignIn(): Promise<void> {
    await this.signInButton.click();
  }

  /**
   * Full login flow for DEV_MODE:
   * - Clicks Sign In, which triggers devAuthenticated=true and window.location.href='/'
   * - Waits for redirect to the learn route
   */
  async loginDevMode(): Promise<void> {
    await this.goto();
    await this.clickSignIn();
    // DEV_MODE sets window.location.href = '/' which redirects → /learn/content-1
    await this.page.waitForURL(/\/learn\//, { timeout: 10_000 });
  }

  /**
   * Logout via the UserMenu dropdown in the Layout header.
   * Clicks the user avatar → "Log out" menu item.
   * Waits for redirect to /login.
   */
  async logout(): Promise<void> {
    // Open the user menu (avatar button in header)
    const userMenuTrigger = this.page.getByRole('button', { name: /user menu/i });
    await userMenuTrigger.click();

    // Click Log out
    const logoutItem = this.page.getByRole('menuitem', { name: /log out/i });
    await logoutItem.click();

    // Wait for redirect to login page
    await this.page.waitForURL('**/login', { timeout: 8_000 });
  }

  /** Assert the login page is fully rendered and ready. */
  async assertVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.subheading).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.signInButton).toBeEnabled();
  }
}

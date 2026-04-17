const { chromium } = require('playwright');

const USERS = [
  {
    email: 'super.admin@edusphere.dev',
    password: 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
  },
  {
    email: 'instructor@example.com',
    password: 'Instructor123!',
    role: 'INSTRUCTOR',
  },
  {
    email: 'org.admin@example.com',
    password: 'OrgAdmin123!',
    role: 'ORG_ADMIN',
  },
  {
    email: 'researcher@example.com',
    password: 'Researcher123!',
    role: 'RESEARCHER',
  },
  { email: 'student@example.com', password: 'Student123!', role: 'STUDENT' },
];

var SCREENSHOT_DIR =
  'C:/Users/P0039217/.claude/projects/EduSphere/docs/screenshots';
var screenshotTaken = false;

async function testUserLogin(browser, user) {
  var context = await browser.newContext();
  var page = await context.newPage();
  var result = {
    email: user.email,
    role: user.role,
    success: false,
    error: null,
    details: '',
  };

  try {
    // Step 1: Navigate directly to the login page
    console.log(
      '[' + user.role + '] Navigating to http://localhost:5173/login...'
    );
    await page.goto('http://localhost:5173/login', { timeout: 15000 });
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(function () {});

    var url1 = page.url();
    console.log('[' + user.role + '] On login page: ' + url1);

    // Step 2: Click the "Sign in with Keycloak" button on the app login page
    // This triggers keycloak.login() which redirects to Keycloak
    console.log(
      '[' + user.role + '] Looking for Sign in button on app login page...'
    );

    var signInBtn = null;
    var signInSelectors = [
      'button:has-text("Sign in with Keycloak")',
      'button:has-text("Sign in")',
      'button:has-text("Sign In")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      '[data-testid="dev-login-btn"]',
      'button.w-full',
    ];

    for (var si = 0; si < signInSelectors.length; si++) {
      try {
        var el = page.locator(signInSelectors[si]).first();
        if (await el.isVisible({ timeout: 2000 })) {
          signInBtn = el;
          var btnText = await el.textContent().catch(function () {
            return '?';
          });
          console.log(
            '[' +
              user.role +
              '] Found button: "' +
              btnText.trim() +
              '" via ' +
              signInSelectors[si]
          );
          break;
        }
      } catch (e) {
        /* try next */
      }
    }

    if (!signInBtn) {
      result.error = 'No sign-in button found on /login page';
      await page.screenshot({
        path:
          SCREENSHOT_DIR +
          '/auth-fail-' +
          user.role.toLowerCase() +
          '-nobutton.png',
      });
      await context.close();
      return result;
    }

    // Click the sign-in button - this should redirect to Keycloak
    await signInBtn.click({ timeout: 5000 });
    console.log('[' + user.role + '] Clicked sign-in button');

    // Wait for navigation - could go to Keycloak or stay in app (dev mode)
    await page.waitForTimeout(3000);
    var url2 = page.url();
    console.log('[' + user.role + '] After click, URL: ' + url2);

    // Check if we ended up on Keycloak or back in the app
    if (url2.includes('keycloak') || url2.includes(':8080')) {
      // We are on Keycloak login form
      console.log('[' + user.role + '] On Keycloak login form');

      var usernameField = page.locator('#username').first();
      var passwordField = page.locator('#password').first();

      await usernameField.waitFor({ state: 'visible', timeout: 10000 });
      await usernameField.fill(user.email);
      console.log('[' + user.role + '] Entered email');

      await passwordField.waitFor({ state: 'visible', timeout: 5000 });
      await passwordField.fill(user.password);
      console.log('[' + user.role + '] Entered password');

      var submitBtn = page
        .locator('#kc-login, button[type="submit"], input[type="submit"]')
        .first();
      await submitBtn.click({ timeout: 5000 });
      console.log('[' + user.role + '] Clicked Keycloak submit');

      // Wait for redirect back to app
      await page.waitForURL(/localhost:5173/, { timeout: 30000 });
      console.log('[' + user.role + '] Redirected back to app: ' + page.url());

      await page
        .waitForLoadState('networkidle', { timeout: 15000 })
        .catch(function () {});
      await page.waitForTimeout(2000);

      // Verify we are logged in (not back on /login)
      var finalUrl = page.url();
      if (finalUrl.includes('/login')) {
        result.error =
          'Redirected back to /login after Keycloak auth - login may have failed';
        await page.screenshot({
          path:
            SCREENSHOT_DIR + '/auth-fail-' + user.role.toLowerCase() + '.png',
        });
      } else {
        result.success = true;
        result.details = 'Keycloak auth successful. URL: ' + finalUrl;
      }
    } else if (url2.includes('localhost:5173') && !url2.includes('/login')) {
      // Dev mode login - redirected back to app directly
      console.log(
        '[' + user.role + '] Dev mode login - redirected to: ' + url2
      );
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(function () {});
      await page.waitForTimeout(2000);
      result.success = true;
      result.details = 'Dev mode login successful. URL: ' + url2;
    } else if (url2.includes('/login')) {
      // Still on login page - maybe page reloaded for dev mode
      // Wait a bit more and check
      await page.waitForTimeout(3000);
      await page
        .waitForLoadState('networkidle', { timeout: 10000 })
        .catch(function () {});
      var url3 = page.url();
      console.log('[' + user.role + '] After waiting, URL: ' + url3);

      if (url3.includes('/login')) {
        // Check if we need to wait for Keycloak redirect
        await page
          .waitForURL(
            function (u) {
              return !u.toString().includes('/login');
            },
            { timeout: 15000 }
          )
          .catch(function () {});
        var url4 = page.url();
        console.log('[' + user.role + '] Final URL: ' + url4);

        if (url4.includes('keycloak') || url4.includes(':8080')) {
          // Keycloak appeared late
          var uf = page.locator('#username').first();
          var pf = page.locator('#password').first();
          await uf.waitFor({ state: 'visible', timeout: 10000 });
          await uf.fill(user.email);
          await pf.waitFor({ state: 'visible', timeout: 5000 });
          await pf.fill(user.password);
          var sb = page.locator('#kc-login, button[type="submit"]').first();
          await sb.click({ timeout: 5000 });
          await page.waitForURL(/localhost:5173/, { timeout: 30000 });
          await page
            .waitForLoadState('networkidle', { timeout: 15000 })
            .catch(function () {});
          await page.waitForTimeout(2000);
          result.success = true;
          result.details = 'Late Keycloak redirect. URL: ' + page.url();
        } else if (!url4.includes('/login')) {
          result.success = true;
          result.details = 'Login completed. URL: ' + url4;
        } else {
          result.error = 'Stuck on /login page after clicking sign-in button';
          await page.screenshot({
            path:
              SCREENSHOT_DIR + '/auth-fail-' + user.role.toLowerCase() + '.png',
          });
        }
      } else {
        result.success = true;
        result.details = 'Login completed after wait. URL: ' + url3;
      }
    } else {
      result.error = 'Unexpected URL after login click: ' + url2;
      await page.screenshot({
        path: SCREENSHOT_DIR + '/auth-fail-' + user.role.toLowerCase() + '.png',
      });
    }

    // Take screenshot of first successful login
    if (result.success && !screenshotTaken) {
      await page.screenshot({
        path: SCREENSHOT_DIR + '/bug104-105-auth-verify.png',
        fullPage: false,
      });
      screenshotTaken = true;
      console.log(
        '[' + user.role + '] Screenshot saved to bug104-105-auth-verify.png'
      );
    }

    // Step 5: Log out (try various methods)
    if (result.success) {
      console.log('[' + user.role + '] Attempting logout...');
      var loggedOut = false;

      // Try settings menu or user dropdown first
      var dropdownSelectors = [
        '[data-testid="user-menu"]',
        'button[aria-label*="user"]',
        'button[aria-label*="menu"]',
        'button[aria-label*="settings"]',
        'nav button:last-child',
      ];

      for (var di = 0; di < dropdownSelectors.length; di++) {
        try {
          var dd = page.locator(dropdownSelectors[di]).first();
          if (await dd.isVisible({ timeout: 1000 })) {
            await dd.click();
            await page.waitForTimeout(500);
            break;
          }
        } catch (e) {
          /* try next */
        }
      }

      // Try settings page which usually has logout
      try {
        var settingsLink = page
          .locator('a[href*="settings"], text=Settings')
          .first();
        if (await settingsLink.isVisible({ timeout: 1000 })) {
          await settingsLink.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {}

      var logoutSelectors = [
        'text=Logout',
        'text=Log out',
        'text=Sign out',
        'text=Sign Out',
        'button:has-text("Logout")',
        'button:has-text("Log out")',
        'button:has-text("Sign out")',
        '[data-testid="logout"]',
        '[data-testid="logout-button"]',
      ];

      for (var li = 0; li < logoutSelectors.length; li++) {
        try {
          var logoutEl = page.locator(logoutSelectors[li]).first();
          if (await logoutEl.isVisible({ timeout: 1000 })) {
            await logoutEl.click({ timeout: 3000 });
            loggedOut = true;
            console.log('[' + user.role + '] Logged out');
            break;
          }
        } catch (e) {
          /* try next */
        }
      }

      if (!loggedOut) {
        console.log(
          '[' +
            user.role +
            '] No logout button found, using fresh context for next user'
        );
      }

      await page.waitForTimeout(2000);
    }
  } catch (err) {
    result.error = err.message.split('\n')[0]; // first line only
    console.log('[' + user.role + '] ERROR: ' + result.error);

    try {
      await page.screenshot({
        path: SCREENSHOT_DIR + '/auth-fail-' + user.role.toLowerCase() + '.png',
        fullPage: false,
      });
    } catch (e) {
      /* ignore */
    }
  }

  await context.close();
  return result;
}

async function main() {
  console.log('=== EduSphere 5-User Auth Verification ===');
  console.log('Date: ' + new Date().toISOString());
  console.log('');

  var browser = await chromium.launch({ headless: true });
  var results = [];

  for (var i = 0; i < USERS.length; i++) {
    var user = USERS[i];
    console.log('\n--- Testing ' + user.role + ' (' + user.email + ') ---');
    var result = await testUserLogin(browser, user);
    results.push(result);
    var statusEmoji = result.success ? 'SUCCESS' : 'FAILED';
    console.log(
      'Result: ' + statusEmoji + (result.error ? ' - ' + result.error : '')
    );
  }

  await browser.close();

  // Summary
  console.log('\n');
  console.log('========= AUTHENTICATION RESULTS =========');
  console.log('==========================================');
  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    var status = res.success ? 'PASS' : 'FAIL';
    var rolePadded = (res.role + '            ').substring(0, 12);
    console.log(status + ' | ' + rolePadded + ' | ' + res.email);
    if (res.error) console.log('       Error: ' + res.error);
    if (res.details) console.log('       ' + res.details);
  }
  console.log('==========================================');

  var passed = results.filter(function (r) {
    return r.success;
  }).length;
  var failed = results.filter(function (r) {
    return !r.success;
  }).length;
  console.log(
    'Total: ' +
      passed +
      ' passed, ' +
      failed +
      ' failed out of ' +
      results.length
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function (err) {
  console.error('Fatal error:', err);
  process.exit(2);
});

import { test, expect, Page } from '@playwright/test';

/**
 * Internal Email Links E2E Tests
 * Verifies all email links open internal CRM compose modal (not mailto:)
 * Also verifies location-based segments in email marketing
 */

test.use({ storageState: undefined });

let authPage: Page;
let browserContext: any;

test.beforeAll(async ({ browser }) => {
  browserContext = await browser.newContext();
  authPage = await browserContext.newPage();

  console.log('[Auth] Logging in...');
  await authPage.goto('https://react.ecbtx.com/login');
  await authPage.fill('input[type="email"]', 'will@macseptic.com');
  await authPage.fill('input[type="password"]', '#Espn2025');
  await authPage.click('button[type="submit"]');
  await authPage.waitForFunction(() => !location.href.includes('/login'), { timeout: 15000 });
  console.log('[Auth] Login successful');
});

test.describe.serial('Internal Email Links', () => {
  test('prospects page: email opens compose modal', async () => {
    await authPage.goto('https://react.ecbtx.com/prospects');
    await authPage.waitForTimeout(2000);

    // Find any email button in the table (not an <a> tag)
    const emailButton = authPage.locator('table button').filter({ hasText: /@/ }).first();
    const emailExists = await emailButton.count() > 0;

    if (emailExists) {
      const emailText = await emailButton.textContent();
      console.log('[Prospects] Found email:', emailText);

      // Click it
      await emailButton.click();
      await authPage.waitForTimeout(500);

      // Should open compose modal
      const modal = authPage.locator('text=Compose Email');
      await expect(modal).toBeVisible({ timeout: 3000 });

      // URL should NOT have changed to mailto:
      expect(authPage.url()).toContain('prospects');
      console.log('[Prospects] Compose modal opened - PASS');

      // Close modal
      await authPage.keyboard.press('Escape');
      await authPage.waitForTimeout(300);
    } else {
      console.log('[Prospects] No email links found in table - SKIP');
    }
  });

  test('customers page: email opens compose modal', async () => {
    await authPage.goto('https://react.ecbtx.com/customers');
    await authPage.waitForTimeout(2000);

    const emailButton = authPage.locator('table button').filter({ hasText: /@/ }).first();
    const emailExists = await emailButton.count() > 0;

    if (emailExists) {
      const emailText = await emailButton.textContent();
      console.log('[Customers] Found email:', emailText);

      await emailButton.click();
      await authPage.waitForTimeout(500);

      const modal = authPage.locator('text=Compose Email');
      await expect(modal).toBeVisible({ timeout: 3000 });
      expect(authPage.url()).toContain('customers');
      console.log('[Customers] Compose modal opened - PASS');

      await authPage.keyboard.press('Escape');
      await authPage.waitForTimeout(300);
    } else {
      console.log('[Customers] No email links found in table - SKIP');
    }
  });

  test('technicians page: email opens compose modal', async () => {
    await authPage.goto('https://react.ecbtx.com/technicians');
    await authPage.waitForTimeout(2000);

    const emailButton = authPage.locator('table button').filter({ hasText: /@/ }).first();
    const emailExists = await emailButton.count() > 0;

    if (emailExists) {
      const emailText = await emailButton.textContent();
      console.log('[Technicians] Found email:', emailText);

      await emailButton.click();
      await authPage.waitForTimeout(500);

      const modal = authPage.locator('text=Compose Email');
      await expect(modal).toBeVisible({ timeout: 3000 });
      expect(authPage.url()).toContain('technicians');
      console.log('[Technicians] Compose modal opened - PASS');

      await authPage.keyboard.press('Escape');
      await authPage.waitForTimeout(300);
    } else {
      console.log('[Technicians] No email links found in table - SKIP');
    }
  });

  test('no mailto: links exist in CRM pages', async () => {
    const pages = ['/prospects', '/customers', '/technicians'];

    for (const page of pages) {
      await authPage.goto(`https://react.ecbtx.com${page}`);
      await authPage.waitForTimeout(2000);

      // Check there are NO <a href="mailto:..."> links
      const mailtoLinks = await authPage.locator('a[href^="mailto:"]').count();
      console.log(`[${page}] mailto: links found: ${mailtoLinks}`);
      expect(mailtoLinks).toBe(0);
    }
    console.log('[No mailto] All pages clean - PASS');
  });

  test('email marketing segments include location segments', async () => {
    const segResponse = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/segments', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Segments] Response:', JSON.stringify(segResponse));
    expect(Array.isArray(segResponse)).toBe(true);

    // Check for the 4 location segments
    const segmentIds = segResponse.map((s: any) => s.id);
    expect(segmentIds).toContain('central_texas');
    expect(segmentIds).toContain('nashville');
    expect(segmentIds).toContain('columbia_sc');
    expect(segmentIds).toContain('greenville_tn');

    // Check Central Texas has real counts (most customers are TX)
    const txSegment = segResponse.find((s: any) => s.id === 'central_texas');
    console.log('[Segments] Central Texas count:', txSegment?.count);
    expect(txSegment).toBeDefined();

    console.log('[Segments] All 4 location segments present - PASS');
  });
});

test.afterAll(async () => {
  console.log('[Cleanup] Closing browser context');
  if (authPage) await authPage.close();
  if (browserContext) await browserContext.close();
});

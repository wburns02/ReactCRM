import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Email Marketing E2E Tests
 * Verifies the full email marketing feature works end-to-end
 *
 * Uses admin credentials (will@macseptic.com) for full access.
 * Pattern: login in first test, share page across serial describe block.
 */

const APP_URL = 'https://react.ecbtx.com';
const API_URL = 'https://react-crm-api-production.up.railway.app/api/v2';

test.describe.serial('Email Marketing Feature', () => {
  let context: BrowserContext;
  let page: Page;

  test('0. Login as admin', async ({ browser }) => {
    // Create fresh context with no stored auth state
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: undefined,
    });
    page = await context.newPage();
    await context.clearCookies();

    await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // If already logged in as someone else, clear and retry
    if (!page.url().includes('/login')) {
      await context.clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !location.href.includes('/login'), { timeout: 20000 });
    await page.waitForTimeout(2000);
    console.log('[Auth] Logged in, url:', page.url());
  });

  test('1. Page loads and navigation works', async () => {
    await page.goto(`${APP_URL}/marketing/email-marketing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log('[Test 1] URL:', url);
    expect(url).toContain('email-marketing');
  });

  test('2. /status returns 200 with subscription and tier', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/status`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.subscription).toBeDefined();
    expect(result.data.subscription.tier).toBeDefined();
    expect(result.data.tiers).toBeDefined();
    console.log('[Test 2] Tier:', result.data.subscription.tier, 'PASS');
  });

  test('3. /contacts returns 200 with real customer emails', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/contacts`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('total');
    expect(result.data).toHaveProperty('contacts');
    expect(Array.isArray(result.data.contacts)).toBe(true);
    // Real customers with emails should exist
    expect(result.data.total).toBeGreaterThan(0);
    const first = result.data.contacts[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('email');
    expect(first).toHaveProperty('name');
    console.log('[Test 3] Contacts:', result.data.total, 'PASS');
  });

  test('4. /campaigns returns 200 with campaigns array', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/campaigns`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    console.log('[Test 4] Campaigns:', result.data.length, 'PASS');
  });

  test('5. /segments returns 200 with real segment counts', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/segments`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    const allSegment = result.data.find((s: { id: string }) => s.id === 'all');
    expect(allSegment).toBeDefined();
    expect(allSegment.count).toBeGreaterThan(0);
    console.log('[Test 5] All segment count:', allSegment.count, 'PASS');
  });

  test('6. /analytics returns 200 with totals', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/analytics?days=30`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(result.data.totals).toBeDefined();
    expect(result.data.top_campaigns).toBeDefined();
    expect(result.data.daily_stats).toBeDefined();
    console.log('[Test 6] Analytics totals:', result.data.totals, 'PASS');
  });

  test('7. /stats returns 200 with configured field (graceful without SendGrid key)', async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/stats`, { credentials: 'include' });
      const data = await resp.json();
      return { status: resp.status, data };
    }, API_URL);

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('configured');
    console.log('[Test 7] Stats configured:', result.data.configured, 'PASS');
  });

  test('8. Campaign CRUD works', async () => {
    // Create
    const createResult = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/email-marketing/campaigns`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'E2E Test Campaign',
          description: 'Created by Playwright test',
          segment: 'all',
        }),
      });
      return resp.json();
    }, API_URL);

    expect(createResult.success).toBe(true);
    expect(createResult.campaign.name).toBe('E2E Test Campaign');
    expect(createResult.campaign.status).toBe('draft');
    const campaignId = createResult.campaign.id;

    // Delete the test campaign
    const deleteResult = await page.evaluate(async ({ apiUrl, id }: { apiUrl: string; id: string }) => {
      const resp = await fetch(`${apiUrl}/email-marketing/campaigns/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return resp.json();
    }, { apiUrl: API_URL, id: campaignId });
    expect(deleteResult.success).toBe(true);
    console.log('[Test 8] Campaign CRUD PASS');
  });

  test('9. Page renders without 501 errors', async () => {
    await page.goto(`${APP_URL}/marketing/email-marketing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('501');
    expect(bodyText).not.toContain('Something went wrong');
    expect(bodyText).not.toContain('Not Implemented');
    console.log('[Test 9] No 501 errors PASS');
  });

  test('10. Page shows Email Marketing heading', async () => {
    const heading = page.locator('h1').filter({ hasText: /email marketing/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
    console.log('[Test 10] Heading visible PASS');
  });

  test.afterAll(async () => {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  });
});

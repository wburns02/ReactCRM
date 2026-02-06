import { test, expect, Page } from '@playwright/test';

/**
 * Email Marketing E2E Tests
 * Verifies the full email marketing feature works end-to-end
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

test.describe.serial('Email Marketing Feature', () => {
  test('page loads and navigation works', async () => {
    await authPage.goto('https://react.ecbtx.com/marketing/email-marketing');
    await authPage.waitForTimeout(3000);
    const url = authPage.url();
    console.log('[Test 1] URL:', url);
    expect(url).toContain('email-marketing');
  });

  test('segments show real customer counts', async () => {
    const segResponse = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/segments', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 2] Segments:', JSON.stringify(segResponse));
    expect(Array.isArray(segResponse)).toBe(true);
    expect(segResponse.length).toBeGreaterThan(0);
    const hasCustomers = segResponse.some((s: any) => s.count > 0);
    expect(hasCustomers).toBe(true);
    console.log('[Test 2] PASS');
  });

  test('status returns subscription and tiers', async () => {
    const statusResponse = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/status', { credentials: 'include' });
      return resp.json();
    });

    expect(statusResponse.success).toBe(true);
    expect(statusResponse.subscription).toBeDefined();
    expect(statusResponse.subscription.tier).toBeDefined();
    expect(statusResponse.tiers).toBeDefined();
    console.log('[Test 3] Tier:', statusResponse.subscription.tier, 'PASS');
  });

  test('onboarding returns 6 questions', async () => {
    const questions = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/ai/onboarding-questions', { credentials: 'include' });
      return resp.json();
    });

    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(6);
    expect(questions[0].id).toBe('services');
    console.log('[Test 4] Questions:', questions.length, 'PASS');
  });

  test('analytics returns proper structure', async () => {
    const analytics = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/analytics?days=30', { credentials: 'include' });
      return resp.json();
    });

    expect(analytics.totals).toBeDefined();
    expect(analytics.totals.total_sent).toBeDefined();
    expect(analytics.top_campaigns).toBeDefined();
    expect(analytics.daily_stats).toBeDefined();
    console.log('[Test 5] Analytics totals:', analytics.totals, 'PASS');
  });

  test('campaign CRUD works', async () => {
    // Create
    const createResult = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/campaigns', {
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
    });

    expect(createResult.success).toBe(true);
    expect(createResult.campaign.name).toBe('E2E Test Campaign');
    expect(createResult.campaign.status).toBe('draft');
    const campaignId = createResult.campaign.id;
    console.log('[Test 6] Created campaign:', campaignId);

    // List
    const campaigns = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/campaigns', { credentials: 'include' });
      return resp.json();
    });
    expect(campaigns.length).toBeGreaterThan(0);
    console.log('[Test 6] Campaigns count:', campaigns.length);

    // Delete
    const deleteResult = await authPage.evaluate(async (id: string) => {
      const resp = await fetch(`https://react-crm-api-production.up.railway.app/api/v2/email-marketing/campaigns/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return resp.json();
    }, campaignId);
    expect(deleteResult.success).toBe(true);
    console.log('[Test 6] PASS');
  });

  test('profile update persists', async () => {
    const result = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: 'MAC Septic',
          brand_voice: 'friendly',
          service_areas: ['East Central Texas'],
        }),
      });
      return resp.json();
    });

    expect(result.success).toBe(true);
    expect(result.profile.business_name).toBe('MAC Septic');

    // Verify persistence
    const profile = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/profile', { credentials: 'include' });
      return resp.json();
    });
    expect(profile.profile.business_name).toBe('MAC Septic');
    console.log('[Test 7] PASS');
  });

  test('AI suggestions endpoint returns data', async () => {
    const result = await authPage.evaluate(async () => {
      const resp = await fetch('https://react-crm-api-production.up.railway.app/api/v2/email-marketing/ai/suggestions', { credentials: 'include' });
      return resp.json();
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    console.log('[Test 8] Suggestions:', result.suggestions.length, 'PASS');
  });
});

test.afterAll(async () => {
  console.log('[Cleanup] Closing browser context');
  if (authPage) await authPage.close();
  if (browserContext) await browserContext.close();
});

import { test, expect, Page } from '@playwright/test';

/**
 * Email Marketing E2E Tests
 * Verifies the full email marketing feature works end-to-end
 */

test.use({ storageState: undefined });
test.setTimeout(60000);

let authPage: Page;
let browserContext: any;

test.beforeAll(async ({ browser }) => {
  browserContext = await browser.newContext({ ignoreHTTPSErrors: true });
  authPage = await browserContext.newPage();

  // Filter known console errors
  authPage.on('console', msg => {
    const text = msg.text();
    if (text.includes('API Schema Violation') || text.includes('Sentry') ||
        text.includes('ResizeObserver') || text.includes('favicon') ||
        text.includes('Failed to load resource') || text.includes('server responded with')) {
      return;
    }
  });

  console.log('[Auth] Logging in...');
  await authPage.goto('https://react.ecbtx.com/login');
  await authPage.fill('input[type="email"]', 'will@macseptic.com');
  await authPage.fill('input[type="password"]', '#Espn2025');
  await authPage.click('button[type="submit"]');
  await authPage.waitForFunction(() => !location.href.includes('/login'));
  console.log('[Auth] Login successful');
});

test.describe('Email Marketing Feature', () => {
  test('should navigate to email marketing page', async () => {
    await authPage.goto('https://react.ecbtx.com/marketing/email-marketing');
    await authPage.waitForTimeout(2000);

    // Page should load without redirecting to error
    const url = authPage.url();
    console.log('[Test 1] URL:', url);
    expect(url).toContain('email-marketing');

    // Should show the page title or tabs
    const pageContent = await authPage.textContent('body');
    console.log('[Test 1] Page has content:', pageContent?.length, 'chars');
    expect(pageContent?.length).toBeGreaterThan(100);
  });

  test('should show segments with real customer counts', async () => {
    await authPage.goto('https://react.ecbtx.com/marketing/email-marketing');
    await authPage.waitForTimeout(3000);

    // Check API directly for segments
    const segResponse = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/segments', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 2] Segments:', JSON.stringify(segResponse));
    expect(Array.isArray(segResponse)).toBe(true);
    expect(segResponse.length).toBeGreaterThan(0);

    // At least one segment should have non-zero count
    const hasCustomers = segResponse.some((s: any) => s.count > 0);
    console.log('[Test 2] Has customers in segments:', hasCustomers);
    expect(hasCustomers).toBe(true);
  });

  test('should show status with subscription tier', async () => {
    const statusResponse = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/status', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 3] Status:', JSON.stringify(statusResponse).slice(0, 200));
    expect(statusResponse.success).toBe(true);
    expect(statusResponse.subscription).toBeDefined();
    expect(statusResponse.subscription.tier).toBeDefined();
    expect(statusResponse.tiers).toBeDefined();
    console.log('[Test 3] Tier:', statusResponse.subscription.tier);
  });

  test('should return onboarding questions', async () => {
    const questions = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/ai/onboarding-questions', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 4] Questions:', questions.length);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(6);
    expect(questions[0].id).toBe('services');
  });

  test('should return analytics data', async () => {
    const analytics = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/analytics?days=30', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 5] Analytics:', JSON.stringify(analytics).slice(0, 200));
    expect(analytics.totals).toBeDefined();
    expect(analytics.totals.total_sent).toBeDefined();
    expect(analytics.top_campaigns).toBeDefined();
    expect(analytics.daily_stats).toBeDefined();
  });

  test('should create and list a campaign', async () => {
    // Create campaign
    const createResult = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/campaigns', {
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

    console.log('[Test 6] Created campaign:', createResult.campaign?.id);
    expect(createResult.success).toBe(true);
    expect(createResult.campaign).toBeDefined();
    expect(createResult.campaign.name).toBe('E2E Test Campaign');
    expect(createResult.campaign.status).toBe('draft');

    // List campaigns
    const campaigns = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/campaigns', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 6] Campaigns count:', campaigns.length);
    expect(campaigns.length).toBeGreaterThan(0);

    const testCampaign = campaigns.find((c: any) => c.name === 'E2E Test Campaign');
    expect(testCampaign).toBeDefined();

    // Delete campaign
    if (testCampaign) {
      const deleteResult = await authPage.evaluate(async (id: string) => {
        const resp = await fetch(`/api/v2/email-marketing/campaigns/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        return resp.json();
      }, testCampaign.id);
      console.log('[Test 6] Deleted:', deleteResult.success);
      expect(deleteResult.success).toBe(true);
    }
  });

  test('should update business profile', async () => {
    const result = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/profile', {
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

    console.log('[Test 7] Profile updated:', result.success);
    expect(result.success).toBe(true);
    expect(result.profile.business_name).toBe('MAC Septic');

    // Verify it persisted
    const profile = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/profile', { credentials: 'include' });
      return resp.json();
    });
    expect(profile.profile.business_name).toBe('MAC Septic');
  });

  test('should return AI suggestions endpoint', async () => {
    const result = await authPage.evaluate(async () => {
      const resp = await fetch('/api/v2/email-marketing/ai/suggestions', { credentials: 'include' });
      return resp.json();
    });

    console.log('[Test 8] Suggestions:', result.suggestions?.length);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});

test.afterAll(async () => {
  console.log('[Cleanup] Closing browser context');
  if (authPage) await authPage.close();
  if (browserContext) await browserContext.close();
});

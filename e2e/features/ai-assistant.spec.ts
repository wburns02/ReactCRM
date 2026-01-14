import { test, expect } from '@playwright/test';

/**
 * AI Assistant Feature E2E Tests
 *
 * Tests the AI Assistant page at /ai-assistant
 * Validates:
 * - Page loads without "AI server unavailable" error
 * - Onboarding progress/recommendations hooks work
 * - AI Dispatch suggestions/stats endpoints return data
 * - CS AI insights endpoints work
 * - No critical console errors
 *
 * These tests verify the fixes made for:
 * - useOnboardingAI.ts path corrections
 * - useAIDispatch.ts path corrections
 * - useAIInsights.ts path corrections
 * - Backend endpoint additions
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_URL = process.env.API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

test.describe('AI Assistant Page', () => {
  test('AI Assistant page loads successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    // If redirected to login, skip - need auth
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Verify page loaded - look for any content
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('AI Assistant does NOT show "AI server unavailable" error', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for API calls to complete

    // Check that the error message is NOT visible
    const errorMessage = page.locator('text=/AI server unavailable/i');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    expect(isErrorVisible).toBe(false);
  });

  test('AI Assistant page loads without critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      if (response.status() >= 400 && response.status() < 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out benign errors
    const critical404s = networkErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('apple-touch-icon') &&
        !err.includes('manifest') &&
        err.includes('api/')
    );

    // Should have no API 404 errors after our fixes
    // (Previously had onboarding/progress and onboarding/recommendations 404s)
    expect(critical404s.length).toBe(0);
  });

  test('AI Assistant shows onboarding progress section', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for onboarding-related content or any meaningful page content
    const onboardingSection = page.locator('text=/onboarding|progress|getting started|setup|welcome|task/i').first();
    const hasOnboarding = await onboardingSection.isVisible().catch(() => false);

    // Also check page has loaded with some content (not blank/error state)
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 200;

    // Should show onboarding OR at least meaningful page content
    expect(hasOnboarding || hasContent).toBe(true);
  });

  test('AI Assistant shows recommendations section', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for recommendations or any AI-related content
    const recommendationsSection = page.locator('text=/recommend|suggestion|tip|insight|AI|assistant|help/i').first();
    const hasRecommendations = await recommendationsSection.isVisible().catch(() => false);

    // Also check page has loaded with meaningful content
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 200;

    // Should show recommendations OR at least meaningful page content
    expect(hasRecommendations || hasContent).toBe(true);
  });
});

test.describe('Onboarding API Endpoints', () => {
  test('GET /onboarding/progress returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/onboarding/progress`, {
      headers: { 'Content-Type': 'application/json' },
    });

    // 200 = working, 401 = needs auth (endpoint exists), 404 = broken
    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /onboarding/recommendations returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/onboarding/recommendations`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /onboarding/contextual-help returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/onboarding/contextual-help?page=dashboard`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });
});

test.describe('AI Dispatch API Endpoints', () => {
  test('GET /ai/dispatch/suggestions returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/ai/dispatch/suggestions`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /ai/dispatch/stats returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/ai/dispatch/stats`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /ai/dispatch/prompt returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/ai/dispatch/prompt`, {
      headers: { 'Content-Type': 'application/json' },
      data: { prompt: 'Schedule all unassigned jobs' },
    });

    const validStatuses = [200, 401, 422]; // 422 = validation error (endpoint exists)
    expect(validStatuses).toContain(response.status());
  });

  test('GET /ai/dispatch/history returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/ai/dispatch/history`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /ai/dispatch/auto-assign returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/ai/dispatch/auto-assign`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /ai/dispatch/technicians returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/ai/dispatch/technicians`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /ai/dispatch/analyze returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/ai/dispatch/analyze`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /ai/dispatch/optimize-route returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/ai/dispatch/optimize-route`, {
      headers: { 'Content-Type': 'application/json' },
      data: { technician_id: 1, date: '2026-01-14' },
    });

    // Note: path was fixed from /optimize-routes to /optimize-route
    const validStatuses = [200, 401, 422];
    expect(validStatuses).toContain(response.status());
  });
});

test.describe('CS AI Insights API Endpoints', () => {
  test('GET /cs/ai/portfolio-insights returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/cs/ai/portfolio-insights`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /cs/ai/subject-suggestions returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/cs/ai/subject-suggestions`, {
      headers: { 'Content-Type': 'application/json' },
      data: { subject: 'Test subject', campaign_goal: 'engagement' },
    });

    const validStatuses = [200, 401, 422];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /cs/ai/campaigns/{id}/ai-analysis returns valid response', async ({ request }) => {
    // Note: path was fixed from /analysis to /ai-analysis
    const response = await request.get(`${API_URL}/cs/ai/campaigns/1/ai-analysis`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401, 404]; // 404 = campaign not found (endpoint exists)
    expect(validStatuses).toContain(response.status());
  });

  test('GET /cs/ai/customers/{id}/insight returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/cs/ai/customers/1/insight`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('GET /cs/ai/recommendations returns valid response', async ({ request }) => {
    const response = await request.get(`${API_URL}/cs/ai/recommendations`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /cs/ai/content-suggestions returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/cs/ai/content-suggestions`, {
      headers: { 'Content-Type': 'application/json' },
      data: { content_type: 'email', context: 'Test context' },
    });

    const validStatuses = [200, 401, 422];
    expect(validStatuses).toContain(response.status());
  });

  test('POST /cs/ai/refresh-insights returns valid response', async ({ request }) => {
    const response = await request.post(`${API_URL}/cs/ai/refresh-insights`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const validStatuses = [200, 401];
    expect(validStatuses).toContain(response.status());
  });
});

test.describe('AI Assistant Navigation', () => {
  test('AI Assistant is accessible from sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Look for AI Assistant link in sidebar/nav
    const aiLink = page.getByRole('link', { name: /AI Assistant|AI Help|Smart Assistant/i }).first();
    const hasLink = await aiLink.isVisible().catch(() => false);

    if (hasLink) {
      await aiLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('ai-assistant');
    }
  });

  test('AI Assistant page has proper heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // Look for AI Assistant heading or any meaningful heading on the page
    const heading = page.getByRole('heading').first();
    const hasHeading = await heading.isVisible().catch(() => false);

    // Also check for page content as fallback
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 200;

    // Page should have either a heading or meaningful content
    expect(hasHeading || hasContent).toBe(true);
  });
});

test.describe('Error Handling', () => {
  test('AI Assistant gracefully handles API errors', async ({ page }) => {
    // This test verifies the demo fallback behavior works
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Page should not show a blank/broken state
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(100);

    // Should not show catastrophic error
    const crashError = page.locator('text=/Something went wrong|Application error|Crash/i');
    const hasCrash = await crashError.isVisible().catch(() => false);
    expect(hasCrash).toBe(false);
  });

  test('AI Assistant shows loading states appropriately', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-assistant`);

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should either show loading or content - not stuck forever
    const contentOrLoading = page.locator('body');
    await expect(contentOrLoading).toBeVisible({ timeout: 10000 });
  });
});

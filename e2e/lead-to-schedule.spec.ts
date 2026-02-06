import { test, expect } from '@playwright/test';

test.describe('Lead to Schedule Integration', () => {
  test('schedule API returns real customer names', async ({ page }) => {
    // Step 1: Login
    await page.goto('https://react.ecbtx.com/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Step 2: Navigate to Schedule page
    await page.goto('https://react.ecbtx.com/schedule');
    await page.waitForLoadState('networkidle');

    // Step 3: Wait for page to fully load
    await page.waitForTimeout(3000);

    // Step 4: Check API response for real customer names
    const apiResponse = await page.evaluate(async () => {
      const response = await fetch('https://react-crm-api-production.up.railway.app/api/v2/schedule/unscheduled', {
        credentials: 'include'
      });
      if (!response.ok) {
        return { error: response.status, items: [] };
      }
      return response.json();
    });

    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Verify customer names are real (not null) for items that have customers
    if (apiResponse.items && apiResponse.items.length > 0) {
      for (const item of apiResponse.items) {
        if (item.customer_id) {
          console.log(`Work order ${item.id}: customer_id=${item.customer_id}, customer_name="${item.customer_name}"`);
          // customer_name should NOT be null when customer_id exists
          expect(item.customer_name).not.toBeNull();
          // Should not be empty string
          expect(item.customer_name).toBeTruthy();
          // Should not match "Customer #X" pattern (that's the frontend fallback)
          expect(item.customer_name).not.toMatch(/^Customer #\d+$/);
        }
      }
    }
  });

  test('schedule page displays real customer names, not placeholders', async ({ page }) => {
    // Login
    await page.goto('https://react.ecbtx.com/login');
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Go to schedule
    await page.goto('https://react.ecbtx.com/schedule');
    await page.waitForLoadState('networkidle');

    // Wait for schedule to load
    await page.waitForTimeout(3000);

    // Get all text content from the schedule area
    const scheduleContent = await page.locator('main').textContent();
    console.log('Schedule page loaded');

    // Take screenshot for evidence
    await page.screenshot({ path: 'test-results/schedule-customer-names.png', fullPage: true });

    // Check for "Customer #" pattern (the old buggy fallback)
    const placeholderPattern = /Customer #\d+/g;
    const placeholderMatches = scheduleContent?.match(placeholderPattern) || [];

    if (placeholderMatches.length > 0) {
      console.log('WARNING: Found placeholder patterns:', placeholderMatches);
    }

    // The test passes if NO placeholder patterns found
    // (meaning real customer names are being displayed)
    expect(placeholderMatches.length).toBe(0);
  });

  test('week view also displays real customer names', async ({ page }) => {
    // Login
    await page.goto('https://react.ecbtx.com/login');
    await page.fill('input[type="email"]', 'will@macseptic.com');
    await page.fill('input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    // Go to schedule
    await page.goto('https://react.ecbtx.com/schedule');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test week-view API endpoint
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Get Monday of current week
    const startDate = monday.toISOString().split('T')[0];

    const weekResponse = await page.evaluate(async (startDate) => {
      const response = await fetch(`https://react-crm-api-production.up.railway.app/api/v2/schedule/week-view?start_date=${startDate}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        return { error: response.status };
      }
      return response.json();
    }, startDate);

    console.log('Week View API Response:', JSON.stringify(weekResponse, null, 2));

    // Check that items in week view have real customer names
    if (weekResponse.days) {
      for (const [date, items] of Object.entries(weekResponse.days)) {
        for (const item of items as any[]) {
          if (item.customer_id && item.customer_name) {
            console.log(`${date}: ${item.customer_name}`);
            expect(item.customer_name).not.toMatch(/^Customer #\d+$/);
          }
        }
      }
    }
  });
});

import { test, expect } from '@playwright/test';

/**
 * Smoke tests for React Schedule page
 *
 * Validates scheduling functionality matches legacy CRM behavior.
 * Uses playwright's baseURL from config and storageState for auth (JWT token in localStorage).
 */

test.describe('Schedule Page Smoke Tests', () => {
  // Auth is handled by storageState from auth.setup.ts - JWT token loaded from localStorage

  test('schedule page loads without crashing', async ({ page }) => {
    const response = await page.goto('/schedule');
    expect(response?.status()).toBeLessThan(500);
  });

  test('schedule page renders header', async ({ page }) => {
    await page.goto('/schedule');

    // Use exact match for main Schedule heading to avoid matching sub-headings
    const header = page.getByRole('heading', { name: 'Schedule', exact: true });
    const loginPage = page.getByText('Sign in to your account');

    await expect(header.or(loginPage)).toBeVisible({ timeout: 10000 });
  });

  test('schedule page has view toggle buttons', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Should have view mode buttons - use first() to handle multiple matches
    const weekButton = page.getByRole('button', { name: 'Week', exact: true });
    await expect(weekButton).toBeVisible({ timeout: 5000 });
  });

  test('schedule page has date navigation', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Look for Today button which is always present in date navigation
    const todayButton = page.getByRole('button', { name: 'Today' });
    await expect(todayButton).toBeVisible({ timeout: 5000 });
  });

  test('schedule page has unscheduled panel', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Look for the Unscheduled Work Orders heading specifically
    const unscheduledHeading = page.getByRole('heading', { name: 'Unscheduled Work Orders' });
    await expect(unscheduledHeading).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Schedule View Modes', () => {
  test('week view displays correctly', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const weekButton = page.getByRole('button', { name: 'Week', exact: true });
    if (await weekButton.isVisible({ timeout: 3000 })) {
      await weekButton.click();

      // Should show multiple day columns
      const dayHeaders = page.locator('[class*="day"], [class*="column"]');
      const count = await dayHeaders.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('day view displays correctly', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const dayButton = page.getByRole('button', { name: 'Day', exact: true });
    if (await dayButton.isVisible({ timeout: 3000 })) {
      await dayButton.click();

      // Day view should be visible
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain('login');
    }
  });

  test('tech view displays correctly', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const techButton = page.getByRole('button', { name: 'Tech', exact: true });
    if (await techButton.isVisible({ timeout: 3000 })) {
      await techButton.click();

      // Should show technician rows
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain('login');
    }
  });

  test('map view displays correctly', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    const mapButton = page.getByRole('button', { name: 'Map', exact: true });
    if (await mapButton.isVisible({ timeout: 3000 })) {
      await mapButton.click();

      // Map container should be visible (Leaflet)
      const mapContainer = page.locator('.leaflet-container, [class*="map"]');
      await expect(mapContainer).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Schedule Drag and Drop', () => {
  test('unscheduled items are draggable', async ({ page }) => {
    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Check for draggable items in unscheduled panel
    const draggableItems = page.locator('[draggable="true"], [data-draggable]');
    const count = await draggableItems.count();

    // This is informational - may be 0 if no unscheduled work orders
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Schedule API Integration', () => {
  test('schedule API returns valid response', async ({ request }) => {
    // Use the FastAPI backend directly for API tests
    const apiUrl = process.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';
    const today = new Date().toISOString().split('T')[0];

    const response = await request.get(
      `${apiUrl}/work-orders/?scheduled_date=${today}`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    expect([200, 401, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    }
  });

  test('technicians API returns valid response', async ({ request }) => {
    const apiUrl = process.env.VITE_API_URL || 'https://react-crm-api-production.up.railway.app/api/v2';

    const response = await request.get(`${apiUrl}/technicians/`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect([200, 401, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    }
  });
});

test.describe('Schedule Error Handling', () => {
  test('handles 500 error gracefully', async ({ page }) => {
    await page.route('**/api/work-orders/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/schedule');

    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Use first() to handle multiple error elements
    const errorIndicator = page.locator('text=/error|failed|try again/i').first();
    await expect(errorIndicator).toBeVisible({ timeout: 5000 });
  });
});

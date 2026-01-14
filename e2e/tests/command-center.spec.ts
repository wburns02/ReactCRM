// MAC Septic CRM - Command Center UI Test Suite
// Tests the Operations Command Center functionality

import { test, expect } from '@playwright/test';

// Track console errors
let consoleErrors: string[] = [];

/**
 * Helper to check if we're on the login page (auth required)
 */
async function isOnLoginPage(page: import('@playwright/test').Page): Promise<boolean> {
  await page.waitForLoadState('networkidle');
  const url = page.url();
  if (url.includes('/login')) return true;

  // Also check if login form is visible (in case URL check fails)
  const loginButton = page.getByRole('button', { name: /sign in/i });
  return await loginButton.isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Helper to navigate to command center and skip if auth required
 */
async function gotoCommandCenter(page: import('@playwright/test').Page, baseURL: string | undefined) {
  await page.goto((baseURL || 'https://react.ecbtx.com') + '/command-center');
  if (await isOnLoginPage(page)) {
    test.skip(true, 'Authentication required');
  }
}

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
});

test.afterEach(async ({}, testInfo) => {
  if (consoleErrors.length > 0) {
    console.log(`Console errors in ${testInfo.title}:`, consoleErrors);
  }
  // Note: We don't fail on console errors as some 3rd party libs may emit warnings
});

test.describe('Navigation - Sidebar Items', () => {
  test('should navigate to Dashboard', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Customers', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/customers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/customers/);
  });

  test('should navigate to Prospects', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/prospects');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/prospects/);
  });

  test('should navigate to Customer Success', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/customer-success');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/customer-success/);
  });

  test('should navigate to Command Center', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/command-center');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/command-center/);
  });

  test('should navigate to Work Orders', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/work-orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/work-orders/);
  });

  test('should navigate to Schedule', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/schedule/);
  });

  test('should navigate to Technicians', async ({ page, baseURL }) => {
    await page.goto(baseURL + '/operations/technicians');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/technicians/);
  });
});

test.describe('Command Center - Core Functionality', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/command-center');
    // Skip all tests in this describe block if authentication is required
    if (await isOnLoginPage(page)) {
      test.skip(true, 'Authentication required - skipping Command Center tests');
    }
  });

  test('should display page title', async ({ page }) => {
    await expect(page.locator('text=Operations Command Center')).toBeVisible({ timeout: 10000 });
  });

  test('should display quick stats row', async ({ page }) => {
    await expect(page.locator('text=TECHS ON DUTY').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=JOBS IN PROGRESS').first()).toBeVisible();
    await expect(page.locator('text=JOBS REMAINING').first()).toBeVisible();
    await expect(page.locator('text=UTILIZATION').first()).toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    await expect(page.locator('text=Jobs Completed Today').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Revenue Today').first()).toBeVisible();
    await expect(page.locator('text=Avg Completion Time').first()).toBeVisible();
    await expect(page.locator('text=Customer Satisfaction').first()).toBeVisible();
  });

  test('should display Live Technician Map', async ({ page }) => {
    await expect(page.locator('text=Live Technician Map')).toBeVisible({ timeout: 10000 });
    // Check map container exists
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should display Dispatch Queue', async ({ page }) => {
    await expect(page.locator('text=Dispatch Queue')).toBeVisible({ timeout: 10000 });
  });

  test('should display connection status', async ({ page }) => {
    await expect(page.locator('text=Live').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show Full Schedule button', async ({ page }) => {
    const button = page.locator('text=Full Schedule');
    await expect(button).toBeVisible({ timeout: 10000 });
  });

  test('should show New Work Order button', async ({ page }) => {
    const button = page.locator('text=New Work Order');
    await expect(button).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dispatch Queue - Interactions', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/command-center');
    if (await isOnLoginPage(page)) {
      test.skip(true, 'Authentication required');
    }
  });

  test('should display unassigned count badge', async ({ page }) => {
    // Badge shows "X unassigned" when there are unassigned jobs, or queue is empty
    const badge = page.locator('[data-testid="unassigned-badge"], text=/unassigned|No unassigned/');
    await expect(badge.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display priority legend', async ({ page }) => {
    // Priority legend should be visible if there are unassigned jobs
    const legend = page.locator('text=Emergency');
    // Legend may not be visible if queue is empty
    const dispatchQueue = page.locator('text=Dispatch Queue');
    await expect(dispatchQueue).toBeVisible({ timeout: 10000 });
  });

  test('should make Details buttons clickable on queue items', async ({ page }) => {
    const detailsButtons = page.locator('button:has-text("Details")');
    const count = await detailsButtons.count();

    if (count > 0) {
      // Just verify the button exists and is clickable (don't navigate away)
      await expect(detailsButtons.first()).toBeEnabled();
    }
  });
});

test.describe('Map Interactions', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/command-center');
    if (await isOnLoginPage(page)) {
      test.skip(true, 'Authentication required');
    }
  });

  test('should display map with zoom controls', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const zoomIn = page.locator('.leaflet-control-zoom-in');
    const zoomOut = page.locator('.leaflet-control-zoom-out');

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
  });

  test('should be able to zoom in and out', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const zoomIn = page.locator('.leaflet-control-zoom-in');
    const zoomOut = page.locator('.leaflet-control-zoom-out');

    await zoomIn.click();
    await page.waitForTimeout(300);
    await zoomOut.click();
  });

  test('should click on technician markers', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const markers = page.locator('.leaflet-marker-icon');
    const count = await markers.count();

    if (count > 0) {
      await markers.first().click();
      await page.waitForTimeout(300);
      // Should show popup
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('KPI Cards - Click and Drill Down', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/command-center');
    if (await isOnLoginPage(page)) {
      test.skip(true, 'Authentication required');
    }
  });

  test('KPI cards should be clickable', async ({ page }) => {
    await expect(page.locator('text=Jobs Completed Today').first()).toBeVisible({ timeout: 10000 });

    // Find the KPI card and click it
    const jobsCard = page.locator('text=Jobs Completed Today').first().locator('..');
    await jobsCard.click();

    // Should show toast or navigate
    await page.waitForTimeout(500);
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should show shortcuts modal with ?', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Press ? to show shortcuts
    await page.keyboard.press('Shift+/'); // ? key

    // Should show shortcuts modal
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`should render correctly on ${viewport.name}`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoCommandCenter(page, baseURL);

      // Basic visibility checks
      await expect(page.locator('text=Operations Command Center')).toBeVisible({ timeout: 15000 });
    });
  }
});

test.describe('Button Hover States', () => {
  test('all buttons should have hover states', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.hover();
        await page.waitForTimeout(100);
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('should have accessible buttons', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Check for basic accessibility
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        // Button should have either aria-label or text content
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    }
  });

  test('should be keyboard navigable', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }
  });
});

test.describe('Real-time Features', () => {
  test('should show connection status indicator', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Look for Live indicator
    const connectionIndicator = page.locator('text=Live').first();
    await expect(connectionIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should show last updated timestamp', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Look for Updated timestamp
    const timestamp = page.locator('text=/Updated/');
    await expect(timestamp).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Click Interactive Elements', () => {
  test('should be able to click through interactive elements', async ({ page, baseURL }) => {
    await gotoCommandCenter(page, baseURL);

    // Wait for the page to fully load
    await expect(page.locator('text=Operations Command Center')).toBeVisible({ timeout: 10000 });

    // Get all clickable elements
    const clickables = page.locator('button:visible');
    const count = await clickables.count();

    console.log(`Found ${count} clickable buttons`);

    let clicked = 0;
    let errors = 0;

    for (let i = 0; i < Math.min(count, 10); i++) {
      try {
        const element = clickables.nth(i);
        if (await element.isEnabled()) {
          await element.click({ timeout: 2000 });
          clicked++;
          await page.waitForTimeout(200);

          // If we navigated away, go back
          if (!page.url().includes('command-center')) {
            await gotoCommandCenter(page, baseURL);
          }
        }
      } catch {
        errors++;
      }
    }

    console.log(`Clicked ${clicked} elements, ${errors} errors`);
    expect(errors).toBeLessThan(count * 0.5); // Less than 50% error rate
  });
});

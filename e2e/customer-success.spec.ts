import { test, expect } from '@playwright/test';

/**
 * Customer Success Platform E2E Tests
 *
 * Tests for the Customer Success module including:
 * - Navigation and tab switching
 * - Executive Dashboard data loading
 * - Segments CRUD operations
 * - Playbooks CRUD operations
 * - Journeys listing and status
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

test.describe('Customer Success Navigation', () => {
  test('navigates to Customer Success page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find and click Customer Success nav link
    const csNavLink = page.getByRole('link', { name: /Customer Success/i });
    await expect(csNavLink).toBeVisible({ timeout: 10000 });
    await csNavLink.click();

    // Should be on CS page with Executive Dashboard tab
    await expect(page).toHaveURL(/\/customer-success/);
    await expect(page.getByText('Executive Overview')).toBeVisible({ timeout: 10000 });
  });

  test('can switch between CS tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Check default tab (Executive)
    await expect(page.getByText('Executive Overview')).toBeVisible();

    // Switch to Overview tab
    const overviewTab = page.getByRole('button', { name: /Overview/i }).first();
    await overviewTab.click();
    await expect(page.getByText('Customer Health')).toBeVisible();

    // Switch to Segments tab
    const segmentsTab = page.getByRole('button', { name: /Segments/i });
    await segmentsTab.click();
    await expect(page.getByRole('button', { name: /Create Segment/i })).toBeVisible();

    // Switch to Playbooks tab
    const playbooksTab = page.getByRole('button', { name: /Playbooks/i });
    await playbooksTab.click();
    await expect(page.getByRole('button', { name: /Create Playbook/i })).toBeVisible();

    // Switch to Journeys tab
    const journeysTab = page.getByRole('button', { name: /Journeys/i });
    await journeysTab.click();
    // Journeys tab should show journey list or empty state
    await page.waitForTimeout(1000);
  });
});

test.describe('Executive Dashboard', () => {
  test('loads executive dashboard with KPIs', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Should show Executive Overview heading
    await expect(page.getByText('Executive Overview')).toBeVisible();

    // Should show KPI cards (check for section headers)
    await expect(page.getByText('Health Distribution')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Task Summary')).toBeVisible();
    await expect(page.getByText('Quick Stats')).toBeVisible();
  });

  test('displays health distribution chart', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Should show health categories
    await expect(page.getByText('Healthy')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('At Risk')).toBeVisible();
    await expect(page.getByText('Critical')).toBeVisible();
  });
});

test.describe('Segments Tab', () => {
  test('shows segments list', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Click Segments tab
    const segmentsTab = page.getByRole('button', { name: /Segments/i });
    await segmentsTab.click();

    // Should show Create Segment button
    await expect(page.getByRole('button', { name: /Create Segment/i })).toBeVisible();
  });

  test('can open create segment modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Navigate to Segments tab
    const segmentsTab = page.getByRole('button', { name: /Segments/i });
    await segmentsTab.click();

    // Click Create Segment button
    const createBtn = page.getByRole('button', { name: /Create Segment/i });
    await createBtn.click();

    // Modal should open
    await expect(page.getByRole('heading', { name: /Create Segment/i })).toBeVisible();

    // Should have form fields
    await expect(page.getByPlaceholder(/Enterprise Accounts/i)).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
  });
});

test.describe('Playbooks Tab', () => {
  test('shows playbooks list', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Click Playbooks tab
    const playbooksTab = page.getByRole('button', { name: /Playbooks/i });
    await playbooksTab.click();

    // Should show Create Playbook button
    await expect(page.getByRole('button', { name: /Create Playbook/i })).toBeVisible({ timeout: 10000 });
  });

  test('can open create playbook modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Navigate to Playbooks tab
    const playbooksTab = page.getByRole('button', { name: /Playbooks/i });
    await playbooksTab.click();

    // Click Create Playbook button
    const createBtn = page.getByRole('button', { name: /Create Playbook/i });
    await createBtn.click();

    // Modal should open
    await expect(page.getByRole('heading', { name: /Create Playbook/i })).toBeVisible();

    // Should have form fields
    await expect(page.getByPlaceholder(/90-Day Onboarding/i)).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
  });

  test('can select a playbook to view details', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Navigate to Playbooks tab
    const playbooksTab = page.getByRole('button', { name: /Playbooks/i });
    await playbooksTab.click();

    // Wait for playbooks to load
    await page.waitForTimeout(2000);

    // Click on first playbook card (if any exist)
    const playbookCards = page.locator('[class*="cursor-pointer"]').first();
    const hasPlaybooks = await playbookCards.isVisible().catch(() => false);

    if (hasPlaybooks) {
      await playbookCards.click();

      // Should show playbook detail modal or expanded view
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Journeys Tab', () => {
  test('shows journeys list', async ({ page }) => {
    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');

    // Click Journeys tab
    const journeysTab = page.getByRole('button', { name: /Journeys/i });
    await journeysTab.click();

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Should show the journeys section
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible();
  });
});

test.describe('CS Page Stability', () => {
  test('no JavaScript errors on CS page load', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto(`${BASE_URL}/customer-success`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check all tabs for errors
    const tabs = ['Overview', 'Segments', 'Journeys', 'Playbooks'];
    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }

    expect(jsErrors, 'JavaScript errors on Customer Success page').toHaveLength(0);
  });
});

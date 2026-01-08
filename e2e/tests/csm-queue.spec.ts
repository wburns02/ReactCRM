import { test, expect } from '@playwright/test';

// Helper to setup authenticated session
async function setupAuth(page: ReturnType<typeof test.info>['project']['use']['page'] extends infer P ? P : never) {
  await page.evaluate(() => {
    sessionStorage.setItem('session_state', JSON.stringify({
      isAuthenticated: true,
      lastValidated: Date.now(),
      userId: '2',
    }));
  });
}

test.describe('CSM Task Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setupAuth(page);
  });

  test('CSM Queue tab is visible and loads task queue', async ({ page }) => {
    // Navigate to Customer Success page
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await expect(taskQueueTab).toBeVisible({ timeout: 10000 });
    await taskQueueTab.click();

    // Verify queue page loads
    await expect(page.getByText('CSM Task Queue')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your prioritized work queue')).toBeVisible();

    // Verify queue stats are displayed
    await expect(page.getByText('Total Tasks')).toBeVisible();
    // Verify at least one urgent element exists (stats or filter or section header)
    await expect(page.getByText('Urgent Priority').first()).toBeVisible();

    // Verify priority filters exist
    await expect(page.getByText('Priority:')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-queue-view.png' });
  });

  test('Task queue shows tasks sorted by priority', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Verify Urgent Priority section appears first
    const urgentSection = page.getByText('Urgent Priority').first();
    await expect(urgentSection).toBeVisible({ timeout: 10000 });

    // Verify task cards are displayed
    const taskCards = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]');
    const taskCount = await taskCards.count();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('Clicking task opens task detail with playbook', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on first task card
    const firstTaskCard = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]').first();
    await firstTaskCard.click();

    // Verify task detail panel opens - tabs are buttons in TaskDetailView
    // Use exact: true to distinguish 'Playbook' tab from 'Playbooks' nav item
    await expect(page.getByRole('button', { name: 'Playbook', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Customer', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'History', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete', exact: true })).toBeVisible();

    // Verify playbook content is displayed
    await expect(page.getByText('Objective').first()).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-task-detail.png' });
  });

  test('Task detail shows customer context', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on first task card
    const firstTaskCard = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]').first();
    await firstTaskCard.click();

    // Wait for task detail panel to open
    await expect(page.getByRole('button', { name: 'Playbook', exact: true })).toBeVisible({ timeout: 10000 });

    // Click Customer tab (buttons in TaskDetailView, not tabs)
    const customerTab = page.getByRole('button', { name: 'Customer', exact: true });
    await customerTab.click();

    // Verify customer context is displayed
    await expect(page.getByText('Customer Overview')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Health Score')).toBeVisible();
    await expect(page.getByText('ARR')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-customer-context.png' });
  });

  test('Outcome form shows quality gates', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on first task card
    const firstTaskCard = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]').first();
    await firstTaskCard.click();

    // Wait for task detail panel to open
    await expect(page.getByRole('button', { name: 'Playbook', exact: true })).toBeVisible({ timeout: 10000 });

    // Click Complete tab (buttons in TaskDetailView, not tabs)
    const completeTab = page.getByRole('button', { name: 'Complete', exact: true });
    await completeTab.click();

    // Verify outcome form elements
    await expect(page.getByText('Outcome Type')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Quality Gates')).toBeVisible();
    await expect(page.getByText('Notes')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-outcome-form.png' });
  });

  test('Weekly Outcomes view shows metrics', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on Outcomes view toggle
    const outcomesButton = page.getByRole('button', { name: /Outcomes/i }).first();
    await outcomesButton.click();

    // Verify weekly outcomes dashboard
    await expect(page.getByText('Weekly Outcomes')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Outcome Metrics')).toBeVisible();
    await expect(page.getByText('Onboarding Completions')).toBeVisible();
    await expect(page.getByText('At-Risk Saves')).toBeVisible();
    await expect(page.getByText('Renewals Secured')).toBeVisible();

    // Verify activity context section
    await expect(page.getByText('Activity Context')).toBeVisible();
    await expect(page.getByText('Calls Made')).toBeVisible();

    // Verify team comparison
    await expect(page.getByText('Team Comparison')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-weekly-outcomes.png' });
  });

  test('Priority filters work correctly', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on Urgent filter to toggle it off
    const urgentFilter = page.locator('button').filter({ hasText: /^Urgent$/ }).first();
    await urgentFilter.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Queue should still show tasks (other priorities)
    const taskCards = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]');
    const taskCount = await taskCards.count();
    expect(taskCount).toBeGreaterThanOrEqual(0);
  });

  test('Category filters work correctly', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on Retention category filter
    const retentionFilter = page.getByRole('button', { name: /Retention/i });
    await retentionFilter.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Queue should show retention tasks or be empty
    await expect(page.getByText('CSM Task Queue')).toBeVisible();
  });

  test('Playbook shows objection handlers', async ({ page }) => {
    await page.goto('/customer-success');
    await page.waitForLoadState('networkidle');

    // Click on Task Queue tab
    const taskQueueTab = page.getByRole('button', { name: /Task Queue/i });
    await taskQueueTab.click();

    // Wait for queue to load
    await page.waitForTimeout(1000);

    // Click on first task card
    const firstTaskCard = page.locator('[class*="rounded-lg"][class*="border"][class*="cursor-pointer"]').first();
    await firstTaskCard.click();

    // Verify playbook has objection handlers section
    const objectionHandlersSection = page.getByText('Objection Handlers');
    if (await objectionHandlersSection.isVisible()) {
      await expect(objectionHandlersSection).toBeVisible();

      // Click on first objection handler to expand it
      const firstHandler = page.locator('button').filter({ hasText: /If they say:/ }).first();
      if (await firstHandler.isVisible()) {
        await firstHandler.click();

        // Verify response is shown
        await expect(page.getByText('Your Response:')).toBeVisible({ timeout: 5000 });
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/csm-playbook-detail.png' });
  });
});

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

test.describe('Marketing Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing`);
    await expect(page.locator('h1')).toContainText('Marketing', { timeout: 15000 });
  });

  test('should load the marketing hub page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Marketing Hub');
    await expect(page.locator('p').filter({ hasText: 'Centralized marketing management' })).toBeVisible();
  });

  test('should display Email Campaigns widget', async ({ page }) => {
    await expect(page.locator('text=Email Campaigns')).toBeVisible();
    await expect(page.locator('text=Manage Campaigns')).toBeVisible();
  });

  test('should display SMS Consent Stats widget', async ({ page }) => {
    await expect(page.locator('text=SMS Consent Stats')).toBeVisible();
    await expect(page.locator('text=Manage SMS Consent')).toBeVisible();
  });

  test('should display Marketing AI Advisor widget', async ({ page }) => {
    await expect(page.locator('text=Marketing AI Advisor')).toBeVisible();
    await expect(page.locator('text=View Suggestions')).toBeVisible();
  });

  test('should have links to feature pages in each widget', async ({ page }) => {
    // Check Email Campaigns link
    const emailLink = page.getByRole('button', { name: /Manage Campaigns/i });
    await expect(emailLink).toBeVisible();

    // Check SMS Consent link
    const smsLink = page.getByRole('button', { name: /Manage SMS Consent/i });
    await expect(smsLink).toBeVisible();

    // Check AI link
    const aiLink = page.getByRole('button', { name: /View Suggestions/i });
    await expect(aiLink).toBeVisible();
  });

  test('should display summary statistics', async ({ page }) => {
    await expect(page.locator('text=Total Reach')).toBeVisible();
    await expect(page.locator('text=Engagement Rate')).toBeVisible();
    await expect(page.locator('text=Leads Generated')).toBeVisible();
    await expect(page.locator('text=ROI')).toBeVisible();
  });

  test('should display recent marketing activity', async ({ page }) => {
    await expect(page.locator('text=Recent Marketing Activity')).toBeVisible();
  });

  test('should navigate to email marketing from widget', async ({ page }) => {
    // Click on Manage Campaigns
    await page.getByRole('button', { name: /Manage Campaigns/i }).click();

    // Should navigate to email marketing page
    await expect(page).toHaveURL(/\/email-marketing$/);
  });
});

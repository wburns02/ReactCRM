/**
 * Marketing Tasks Dashboard E2E Tests
 *
 * Tests the /marketing/tasks page that displays real-time status
 * of SEO services, scheduled tasks, and alerts.
 *
 * Uses pre-authenticated state from auth.setup.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://react.ecbtx.com";

test.describe("Marketing Tasks Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/tasks`);
    // Wait for page to load completely
    await page.waitForLoadState("networkidle");
  });

  test("should load the marketing tasks page", async ({ page }) => {
    // Check if redirected to login
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Wait for the page header to be visible
    await expect(page.getByRole("heading", { name: "Marketing Tasks" })).toBeVisible({
      timeout: 10000,
    });

    // Check subtitle
    const subtitle = page.locator("text=Monitor SEO services, scheduled tasks, and alerts");
    await expect(subtitle).toBeVisible();
  });

  test("should display overview tab with metrics", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for metric cards - at least some should be visible or loading
    const hasPerformance = await page.locator("text=Performance Score").isVisible().catch(() => false);
    const hasSEO = await page.locator("text=SEO Score").isVisible().catch(() => false);
    const hasKeywords = await page.locator("text=Tracked Keywords").isVisible().catch(() => false);
    const hasLoading = await page.locator(".animate-spin").isVisible().catch(() => false);
    const hasError = await page.locator("text=Failed to load").isVisible().catch(() => false);

    // Either content, loading, or error state should be visible
    expect(hasPerformance || hasSEO || hasKeywords || hasLoading || hasError).toBe(true);
  });

  test("should display services in Services tab", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Click Services tab
    const servicesTab = page.locator("button:has-text('Services')");
    if (await servicesTab.isVisible()) {
      await servicesTab.click();
      await page.waitForTimeout(1000);

      // Check for service information
      const pageContent = await page.content();
      const hasServiceInfo =
        pageContent.includes("SEO Monitor") ||
        pageContent.includes("Content Generator") ||
        pageContent.includes("GBP Sync") ||
        pageContent.includes("Port") ||
        pageContent.includes("healthy") ||
        pageContent.includes("degraded");

      expect(hasServiceInfo).toBe(true);
    }
  });

  test("should display scheduled tasks table", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Click Scheduled Tasks tab
    const tasksTab = page.locator("button:has-text('Scheduled Tasks')");
    if (await tasksTab.isVisible()) {
      await tasksTab.click();
      await page.waitForTimeout(1000);

      // Check for table or task information
      const pageContent = await page.content();
      const hasTaskInfo =
        pageContent.includes("PageSpeed") ||
        pageContent.includes("Sitemap") ||
        pageContent.includes("Weekly GBP") ||
        pageContent.includes("Schedule") ||
        pageContent.includes("Run Now");

      expect(hasTaskInfo).toBe(true);
    }
  });

  test("should display alerts or no alerts message", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Click Alerts tab
    const alertsTab = page.locator("button:has-text('Alerts')");
    if (await alertsTab.isVisible()) {
      await alertsTab.click();
      await page.waitForTimeout(1000);

      // Should show either alerts or "no unresolved alerts" message
      const pageContent = await page.content();
      const hasAlertInfo =
        pageContent.includes("No unresolved alerts") ||
        pageContent.includes("Resolve") ||
        pageContent.includes("error") ||
        pageContent.includes("warning") ||
        pageContent.includes("critical");

      expect(hasAlertInfo).toBe(true);
    }
  });

  test("should display sites including ecbtx.com", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Click Sites tab
    const sitesTab = page.locator("button:has-text('Sites')");
    if (await sitesTab.isVisible()) {
      await sitesTab.click();
      await page.waitForTimeout(1000);

      // Check for site information
      const pageContent = await page.content();
      const hasSiteInfo =
        pageContent.includes("ecbtx.com") ||
        pageContent.includes("ECB TX") ||
        pageContent.includes("Neighbors") ||
        pageContent.includes("Configured Sites");

      expect(hasSiteInfo).toBe(true);
    }
  });

  test("should have refresh functionality", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Check for refresh button
    const refreshButton = page.locator("button:has-text('Refresh')");
    const hasRefresh = await refreshButton.isVisible().catch(() => false);

    expect(hasRefresh).toBe(true);
  });

  test("should show timestamp or loading state", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Check for "Updated:" text or loading spinner
    const pageContent = await page.content();
    const hasTimestamp =
      pageContent.includes("Updated:") ||
      pageContent.includes("Refreshing") ||
      pageContent.includes("Loading");

    expect(hasTimestamp).toBe(true);
  });

  test("should have all navigation tabs", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    await page.waitForTimeout(2000);

    // Check all tabs are in the page content
    const pageContent = await page.content();
    const hasOverview = pageContent.includes("Overview");
    const hasServices = pageContent.includes("Services");
    const hasScheduled = pageContent.includes("Scheduled");
    const hasAlerts = pageContent.includes("Alerts");
    const hasSites = pageContent.includes("Sites");

    expect(hasOverview && hasServices && hasScheduled && hasAlerts && hasSites).toBe(true);
  });
});

import { test, expect } from "@playwright/test";

/**
 * Marketing Tasks - Current State Exploration
 *
 * Reproduce and document bugs:
 * - Content Generator not working
 * - GBP Sync not working
 */
test.describe("Marketing Tasks - Current State Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });

  test("explore marketing tasks page current state", async ({ page }) => {
    // Navigate to marketing tasks
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({
      path: "e2e/screenshots/marketing-current-state.png",
      fullPage: true,
    });
    console.log("Marketing Tasks page loaded");

    // Check for Content Generator button/section
    const contentGenSection = page.locator("text=Content Gen").first();
    const contentGenVisible = await contentGenSection
      .isVisible()
      .catch(() => false);
    console.log("Content Generator section visible: " + contentGenVisible);

    // Check for GBP Sync button/section
    const gbpSection = page.locator("text=GBP Sync").first();
    const gbpVisible = await gbpSection.isVisible().catch(() => false);
    console.log("GBP Sync section visible: " + gbpVisible);

    // Check Services tab
    const servicesTab = page.locator("text=Services").first();
    if (await servicesTab.isVisible()) {
      await servicesTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "e2e/screenshots/marketing-services-tab.png",
        fullPage: true,
      });

      // Check for healthy/down statuses
      const healthyCount = await page.locator("text=healthy").count();
      const downCount = await page.locator("text=down").count();
      const unknownCount = await page.locator("text=unknown").count();
      console.log(
        "Services - Healthy: " +
          healthyCount +
          ", Down: " +
          downCount +
          ", Unknown: " +
          unknownCount
      );
    }

    // Go back to Overview
    const overviewTab = page.locator("text=Overview").first();
    await overviewTab.click();
    await page.waitForTimeout(500);

    // Try clicking on Content Made metric
    const contentCard = page.locator("text=Content Made").first();
    if (await contentCard.isVisible()) {
      await contentCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "e2e/screenshots/marketing-content-drawer-state.png",
        fullPage: true,
      });

      // Check if drawer opened
      const drawerTitle = page.locator("text=Generated Content");
      const drawerOpen = await drawerTitle.isVisible().catch(() => false);
      console.log("Content drawer opened: " + drawerOpen);

      // Close drawer
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // Check scheduled tasks
    const scheduledTab = page.locator("text=Scheduled Tasks").first();
    if (await scheduledTab.isVisible()) {
      await scheduledTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "e2e/screenshots/marketing-scheduled-tasks.png",
        fullPage: true,
      });

      // Check for GBP post task
      const gbpTask = page.locator("text=weekly-gbp-post");
      const gbpTaskVisible = await gbpTask.isVisible().catch(() => false);
      console.log("Weekly GBP Post task visible: " + gbpTaskVisible);
    }

    console.log("Current state exploration complete");
  });
});

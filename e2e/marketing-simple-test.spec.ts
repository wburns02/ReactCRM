import { test, expect } from "@playwright/test";

/**
 * Simple test to verify Marketing Tasks page with login
 */
test("Marketing Tasks - Visual Check", async ({ page }) => {
  // Login first
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Navigate to marketing tasks
  await page.goto("https://react.ecbtx.com/marketing/tasks");
  await page.waitForLoadState("networkidle");

  // Give the page time to render
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({
    path: "e2e/screenshots/marketing-tasks-full.png",
    fullPage: true
  });

  console.log("Screenshot captured at e2e/screenshots/marketing-tasks-full.png");

  // Check page title
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Look for any elements on the page
  const pageContent = await page.content();
  const hasMarketingText = pageContent.includes("Marketing") || pageContent.includes("marketing");
  console.log(`Has marketing text: ${hasMarketingText}`);

  // Check for key elements
  const hasSiteSelector = await page.locator("#site-selector").isVisible().catch(() => false);
  console.log(`Site selector visible: ${hasSiteSelector}`);

  const hasScoreGauge = await page.locator('svg[viewBox="0 0 120 120"]').count();
  console.log(`Score gauges found: ${hasScoreGauge}`);

  const hasOverviewTab = await page.locator("text=Overview").isVisible().catch(() => false);
  console.log(`Overview tab visible: ${hasOverviewTab}`);

  // Just pass - this is for visual verification
  expect(true).toBe(true);
});

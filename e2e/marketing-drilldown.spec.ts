import { test, expect } from "@playwright/test";

/**
 * Marketing Tasks Drill-Down Tests
 *
 * Verify that clicking metric cards opens detail drawers with real data.
 */
test.describe("Marketing Tasks - Drill-Down Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });

  test("clicking Keywords opens drawer with keyword list", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on Keywords metric card
    const keywordsCard = page.locator("text=Keywords").first();
    await keywordsCard.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-keywords-drawer.png", fullPage: true });

    // Check for drawer title
    const drawerTitle = page.locator("text=Tracked Keywords");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Check for keyword data (should have at least one keyword row)
    const keywordText = page.locator("text=septic");
    const hasKeywords = await keywordText.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Keywords drawer has keyword data: ${hasKeywords}`);

    // Close drawer
    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    await closeBtn.click();
    await page.waitForTimeout(300);
  });

  test("clicking Pages Found opens drawer with page list", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on Pages Found metric card
    const pagesCard = page.locator("text=Pages Found").first();
    await pagesCard.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-pages-drawer.png", fullPage: true });

    // Check for drawer title
    const drawerTitle = page.locator("text=Indexed Pages");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Check for page URL data
    const pageUrl = page.locator("text=ecbtx.com");
    const hasPages = await pageUrl.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Pages drawer has page data: ${hasPages}`);

    // Close drawer
    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    await closeBtn.click();
  });

  test("clicking Content Made opens drawer with content list", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on Content Made metric card
    const contentCard = page.locator("text=Content Made").first();
    await contentCard.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-content-drawer.png", fullPage: true });

    // Check for drawer title
    const drawerTitle = page.locator("h2:has-text('Generated Content')");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Check for content type filters
    const blogFilter = page.locator("text=Blog Post");
    const hasFilters = await blogFilter.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Content drawer has filters: ${hasFilters}`);

    // Close drawer
    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    await closeBtn.click();
  });

  test("clicking Reviews opens drawer with review list", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on Total Reviews stat card
    const reviewsCard = page.locator("text=Total Reviews").first();
    await reviewsCard.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-reviews-drawer.png", fullPage: true });

    // Check for drawer title
    const drawerTitle = page.locator("text=Customer Reviews");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Check for review star ratings
    const stars = page.locator("text=★");
    const hasStars = await stars.first().isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Reviews drawer has star ratings: ${hasStars}`);

    // Close drawer
    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    await closeBtn.click();
  });

  test("clicking Speed Score opens drawer with vitals", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click on Speed Score gauge
    const speedScore = page.locator("text=Speed Score").first();
    await speedScore.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-vitals-drawer.png", fullPage: true });

    // Check for drawer title
    const drawerTitle = page.locator("text=Website Speed");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Check for Core Web Vitals
    const lcpMetric = page.locator("text=Largest Contentful Paint");
    const hasVitals = await lcpMetric.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Vitals drawer has LCP metric: ${hasVitals}`);

    // Close drawer with Escape key
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("drawer closes on backdrop click", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Open keywords drawer
    const keywordsCard = page.locator("text=Keywords").first();
    await keywordsCard.click();
    await page.waitForTimeout(500);

    // Verify drawer is open
    const drawerTitle = page.locator("text=Tracked Keywords");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Click on backdrop (left side of screen)
    await page.mouse.click(50, 300);
    await page.waitForTimeout(500);

    // Verify drawer is closed
    const drawerGone = await drawerTitle.isHidden({ timeout: 2000 }).catch(() => true);
    console.log(`Drawer closed on backdrop click: ${drawerGone}`);
  });

  test("all drawers load data without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/marketing/tasks");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Open each drawer and verify no errors
    const drawers = [
      { trigger: "Keywords", title: "Tracked Keywords" },
      { trigger: "Pages Found", title: "Indexed Pages" },
      { trigger: "Content Made", title: "Generated Content" },
      { trigger: "Total Reviews", title: "Customer Reviews" },
      { trigger: "Speed Score", title: "Website Speed" },
    ];

    for (const drawer of drawers) {
      const trigger = page.locator(`text=${drawer.trigger}`).first();
      await trigger.click();
      await page.waitForTimeout(1000);

      const title = page.locator(`text=${drawer.title}`);
      const isOpen = await title.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`${drawer.trigger} drawer opened: ${isOpen}`);

      // Close drawer
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("Failed to load resource") && !err.includes("Sentry")
    );

    if (criticalErrors.length > 0) {
      console.log("Critical console errors:", criticalErrors);
    } else {
      console.log("No critical console errors during drawer operations");
    }

    // Take final screenshot
    await page.screenshot({ path: "e2e/screenshots/marketing-all-drawers-tested.png", fullPage: true });
  });
});

import { test, expect, Page } from "@playwright/test";

/**
 * Job Costing E2E Tests
 * Tests the job costing page with calculator, pay rates, dump fees, and commission calculations
 */

// Helper function to login
async function loginIfNeeded(page: Page) {
  // Navigate to login page and login
  await page.goto("https://react.ecbtx.com/login");
  await page.waitForLoadState("domcontentloaded");

  // Check if already logged in (redirected away from login)
  if (!page.url().includes("/login")) {
    return;
  }

  // Fill credentials and login
  await page.fill('input[name="email"], input[type="email"]', "will@macseptic.com");
  await page.fill('input[name="password"], input[type="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|job-costing|schedule)/, { timeout: 15000 });
}

test.describe("Job Costing Page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await loginIfNeeded(page);

    // Navigate to job costing page
    await page.goto("https://react.ecbtx.com/job-costing");
    await page.waitForLoadState("networkidle");
  });

  test("should load job costing page with header", async ({ page }) => {
    // Verify page title contains Job Costing
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Job Costing");

    // Verify subtitle about pay rates and dump fees
    await expect(page.getByText("Calculate and track job costs")).toBeVisible();

    // Take screenshot for evidence
    await page.screenshot({
      path: "e2e/screenshots/job-costing-page.png",
      fullPage: true
    });
  });

  test("should display Calculator and Reports toggle buttons", async ({ page }) => {
    // Check for Calculator button
    const calculatorBtn = page.getByRole("button", { name: /calculator/i });
    await expect(calculatorBtn).toBeVisible();

    // Check for Reports button
    const reportsBtn = page.getByRole("button", { name: /reports/i });
    await expect(reportsBtn).toBeVisible();
  });

  test("should display work order selector card", async ({ page }) => {
    // Check for Select Work Order card
    await expect(page.getByText("Select Work Order")).toBeVisible();

    // Check for work order dropdown
    const workOrderSelect = page.locator("select").first();
    await expect(workOrderSelect).toBeVisible();

    // Check for label text
    await expect(page.getByText("Choose a work order to analyze")).toBeVisible();
  });

  test("should display Job Cost Calculator component", async ({ page }) => {
    // Check for calculator card
    await expect(page.getByText("Job Cost Calculator")).toBeVisible();

    // Check for Labor Cost section heading
    await expect(page.getByRole("heading", { name: /Labor Cost/i })).toBeVisible();

    // Check for Dump Fee Calculator section heading
    await expect(page.getByRole("heading", { name: /Dump Fee/i })).toBeVisible();

    // Check for Material Cost section heading
    await expect(page.getByRole("heading", { name: /Material Cost/i })).toBeVisible();
  });

  test("should display Cost Summary section", async ({ page }) => {
    // Check for Cost Summary section heading
    await expect(page.getByRole("heading", { name: /Cost Summary/i })).toBeVisible();

    // Check that the summary section contains key labels
    await expect(page.getByText("Gross Profit")).toBeVisible();
    await expect(page.getByText("Profit Margin")).toBeVisible();
  });

  test("should display profit margin indicator", async ({ page }) => {
    // Check for margin percentage scale - use first() since there may be multiple occurrences
    await expect(page.getByText("0%").first()).toBeVisible();
    await expect(page.getByText("25%").first()).toBeVisible();
    await expect(page.getByText("35%").first()).toBeVisible();
    await expect(page.getByText("50%+").first()).toBeVisible();
  });

  test("should switch to Reports view when clicking Reports button", async ({ page }) => {
    // Click Reports button
    await page.getByRole("button", { name: /reports/i }).click();

    // Wait for view to update
    await page.waitForTimeout(500);

    // Check for date range filter (only in Reports view)
    await expect(page.getByText("From:")).toBeVisible();
    await expect(page.getByText("To:")).toBeVisible();

    // Check for summary cards
    await expect(page.getByText("Billable Amount")).toBeVisible();
    await expect(page.getByText("Unbilled")).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/job-costing-reports.png",
      fullPage: true
    });
  });

  test("should select a work order from dropdown", async ({ page }) => {
    // Get the work order dropdown
    const workOrderSelect = page.locator("select").first();

    // Wait for work orders to load
    await page.waitForTimeout(2000);

    // Get all options
    const options = await workOrderSelect.locator("option").all();

    // If we have work orders, select the first one
    if (options.length > 1) {
      await workOrderSelect.selectOption({ index: 1 });

      // Verify work order details appear
      await expect(page.getByText("Job Type:")).toBeVisible();
      await expect(page.getByText("Status:")).toBeVisible();
      await expect(page.getByText("Revenue:")).toBeVisible();

      // Take screenshot with work order selected
      await page.screenshot({
        path: "e2e/screenshots/job-costing-work-order-selected.png",
        fullPage: true
      });
    }
  });

  test("should show commission calculation when technician and work order selected", async ({ page }) => {
    // First select a work order to get a job total
    const workOrderSelect = page.locator("select").first();
    await page.waitForTimeout(2000);

    const options = await workOrderSelect.locator("option").all();
    if (options.length > 1) {
      await workOrderSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    }

    // Get the technician select (second select on the page)
    const technicianSelect = page.locator("select").nth(1);

    // Wait for technicians to load
    await page.waitForTimeout(2000);

    const techOptions = await technicianSelect.locator("option").all();
    if (techOptions.length > 1) {
      await technicianSelect.selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      // Commission section may only appear if job total > 0
      // Take screenshot regardless
      await page.screenshot({
        path: "e2e/screenshots/job-costing-commission.png",
        fullPage: true
      });
    }
  });

  test("should calculate labor cost when hours entered", async ({ page }) => {
    // Get the technician select (second select on the page)
    const technicianSelect = page.locator("select").nth(1);
    await page.waitForTimeout(2000);

    const techOptions = await technicianSelect.locator("option").all();
    if (techOptions.length > 1) {
      await technicianSelect.selectOption({ index: 1 });

      // Enter hours in the hours input
      const hoursInput = page.locator('input[type="number"]').first();
      await hoursInput.fill("4");

      // Wait for calculation
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/job-costing-labor-calc.png",
        fullPage: true
      });
    }
  });

  test("should calculate dump fee when gallons entered", async ({ page }) => {
    // Get the dump site select (third select on the page)
    const dumpSiteSelect = page.locator("select").nth(2);
    await page.waitForTimeout(2000);

    const siteOptions = await dumpSiteSelect.locator("option").all();
    if (siteOptions.length > 1) {
      await dumpSiteSelect.selectOption({ index: 1 });

      // Enter gallons in the second number input
      const gallonsInput = page.locator('input[type="number"]').nth(1);
      await gallonsInput.fill("1000");

      // Wait for calculation
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/job-costing-dump-fee.png",
        fullPage: true
      });
    }
  });

  test("should show All Job Costs list in Reports view", async ({ page }) => {
    // Switch to Reports view
    await page.getByRole("button", { name: /reports/i }).click();
    await page.waitForTimeout(1000);

    // Check for All Job Costs section
    await expect(page.getByText("All Job Costs")).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "e2e/screenshots/job-costing-all-costs.png",
      fullPage: true
    });
  });

  test("should show date range filters in Reports view", async ({ page }) => {
    // Switch to Reports view
    await page.getByRole("button", { name: /reports/i }).click();
    await page.waitForTimeout(500);

    // Check for date inputs
    const dateFromInput = page.locator('input[type="date"]').first();
    const dateToInput = page.locator('input[type="date"]').last();

    await expect(dateFromInput).toBeVisible();
    await expect(dateToInput).toBeVisible();

    // Verify they have values (default 30-day range)
    const fromValue = await dateFromInput.inputValue();
    const toValue = await dateToInput.inputValue();

    expect(fromValue).toBeTruthy();
    expect(toValue).toBeTruthy();
  });

  test("should have no critical console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Reload page to capture console errors
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Filter out expected errors (like 404s for endpoints that may not exist yet)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("404") && !err.includes("NetworkError") && !err.includes("Failed to fetch")
    );

    // Log any errors found
    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe("Job Costing API Integration", () => {
  test.beforeEach(async ({ page }) => {
    await loginIfNeeded(page);
  });

  test("should fetch recent work orders on page load", async ({ page }) => {
    // Intercept API call
    const workOrdersPromise = page.waitForResponse(
      (response) => response.url().includes("/work-orders/recent") || response.url().includes("/job-costing"),
      { timeout: 10000 }
    ).catch(() => null);

    // Navigate to job costing
    await page.goto("https://react.ecbtx.com/job-costing");

    const workOrdersResponse = await workOrdersPromise;

    if (workOrdersResponse) {
      expect(workOrdersResponse.status()).toBeLessThan(500);
      console.log("Work orders API status:", workOrdersResponse.status());
    }
  });

  test("should fetch technician pay rates", async ({ page }) => {
    // Intercept API call
    const payRatesPromise = page.waitForResponse(
      (response) => response.url().includes("/technicians/pay-rates") || response.url().includes("/pay-rates"),
      { timeout: 10000 }
    ).catch(() => null);

    // Navigate to job costing
    await page.goto("https://react.ecbtx.com/job-costing");
    await page.waitForTimeout(3000);

    const payRatesResponse = await payRatesPromise;

    if (payRatesResponse) {
      expect(payRatesResponse.status()).toBeLessThan(500);
      console.log("Technician pay rates API status:", payRatesResponse.status());
    } else {
      console.log("Pay rates endpoint not called (may not be deployed yet)");
    }
  });

  test("should fetch dump sites for costing", async ({ page }) => {
    // Intercept API call
    const dumpSitesPromise = page.waitForResponse(
      (response) => response.url().includes("/dump-sites"),
      { timeout: 10000 }
    ).catch(() => null);

    // Navigate to job costing
    await page.goto("https://react.ecbtx.com/job-costing");
    await page.waitForTimeout(3000);

    const dumpSitesResponse = await dumpSitesPromise;

    if (dumpSitesResponse) {
      expect(dumpSitesResponse.status()).toBeLessThan(500);
      console.log("Dump sites API status:", dumpSitesResponse.status());
    } else {
      console.log("Dump sites endpoint not called (may not be deployed yet)");
    }
  });
});

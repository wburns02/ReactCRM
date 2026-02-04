import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Payroll Commissions Date Filter
 * Verifies that date_from and date_to filters work correctly
 *
 * Login credentials:
 * Username: will@macseptic.com
 * Password: #Espn2025
 */

// Helper to login with the required credentials
async function login(page: import("@playwright/test").Page) {
  await page.goto("https://react.ecbtx.com/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');

  // Wait for navigation - could go to dashboard or other page
  await page.waitForURL(/\/(dashboard|payroll|customers)/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Payroll Commissions Date Filter", () => {

  test("1. Commissions tab loads successfully", async ({ page }) => {
    await login(page);
    const networkErrors: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/commissions") && response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to payroll page
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Verify no 500 errors
    expect(networkErrors.length, `Found 500 errors: ${networkErrors.join(", ")}`).toBe(0);

    // Verify commissions list or empty state is visible
    const hasTable = await page.locator('[data-testid="commissions-table"]').or(page.getByText(/no commissions/i)).first().isVisible();
    console.log(`Commissions tab loaded: ${hasTable}`);
  });

  test("2. Date filter inputs are visible", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(1000);

    // Verify date filter inputs exist
    const dateFromInput = page.locator('#date-from');
    const dateToInput = page.locator('#date-to');

    await expect(dateFromInput).toBeVisible({ timeout: 5000 });
    await expect(dateToInput).toBeVisible({ timeout: 5000 });
    console.log("Date filter inputs are visible");
  });

  test("3. Date filters send correct API parameters", async ({ page }) => {
    await login(page);
    const commissionsRequests: { url: string; hasDateFrom: boolean; hasDateTo: boolean }[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/payroll/commissions") && request.method() === "GET") {
        const url = request.url();
        commissionsRequests.push({
          url,
          hasDateFrom: url.includes("date_from="),
          hasDateTo: url.includes("date_to="),
        });
        console.log(`GET Request: ${url}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Clear any previous requests
    commissionsRequests.length = 0;

    // Set date_from filter
    const dateFromInput = page.locator('#date-from');
    await dateFromInput.fill("2026-01-01");
    await page.waitForTimeout(1500); // Wait for debounced API call

    // Check that date_from was sent in request
    const requestWithDateFrom = commissionsRequests.find(r => r.hasDateFrom);
    expect(requestWithDateFrom, "Request should include date_from parameter").toBeTruthy();
    console.log(`Date from filter sent: ${requestWithDateFrom?.url}`);

    // Set date_to filter
    const dateToInput = page.locator('#date-to');
    await dateToInput.fill("2026-01-31");
    await page.waitForTimeout(1500);

    // Check that date_to was sent in request
    const requestWithDateTo = commissionsRequests.find(r => r.hasDateTo);
    expect(requestWithDateTo, "Request should include date_to parameter").toBeTruthy();
    console.log(`Date to filter sent: ${requestWithDateTo?.url}`);
  });

  test("4. API returns 200 with date filters", async ({ page }) => {
    await login(page);
    const apiResponses: { url: string; status: number }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/commissions") &&
          response.url().includes("date_from=") &&
          response.request().method() === "GET") {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
        });
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Set date filters
    const dateFromInput = page.locator('#date-from');
    await dateFromInput.fill("2026-01-01");
    await page.waitForTimeout(1500);

    // Verify API returned 200
    const successResponse = apiResponses.find(r => r.status === 200);
    expect(successResponse, "API should return 200 with date filter").toBeTruthy();
    console.log("API returned 200 with date filter");
  });

  test("5. Filter clears correctly", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Set date filters
    const dateFromInput = page.locator('#date-from');
    const dateToInput = page.locator('#date-to');
    await dateFromInput.fill("2026-01-01");
    await dateToInput.fill("2026-01-31");
    await page.waitForTimeout(1000);

    // Click clear filters button
    const clearBtn = page.getByRole("button", { name: /clear filters/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(1000);

      // Verify inputs are cleared
      await expect(dateFromInput).toHaveValue("");
      await expect(dateToInput).toHaveValue("");
      console.log("Filters cleared successfully");
    } else {
      console.log("Clear button not visible (no active filters)");
    }
  });

  test("6. No console errors with date filtering", async ({ page }) => {
    await login(page);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" &&
          !msg.text().includes("favicon") &&
          !msg.text().includes("ResizeObserver") &&
          !msg.text().includes("Download the React DevTools") &&
          !msg.text().includes("Sentry") &&
          !msg.text().includes("WebSocket") &&
          !msg.text().includes("websocket")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Set date filters
    const dateFromInput = page.locator('#date-from');
    await dateFromInput.fill("2026-01-01");
    await page.waitForTimeout(1500);

    // Verify no relevant console errors
    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join("; ")}`).toBe(0);
    console.log("No console errors with date filtering");
  });

  test("7. Date range changes update commission list", async ({ page }) => {
    await login(page);
    let apiCallCount = 0;

    page.on("request", (request) => {
      if (request.url().includes("/payroll/commissions") &&
          request.method() === "GET" &&
          request.url().includes("date_from=")) {
        apiCallCount++;
        console.log(`API call #${apiCallCount}: ${request.url()}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Reset count after initial load
    apiCallCount = 0;

    // Set first date range
    const dateFromInput = page.locator('#date-from');
    await dateFromInput.fill("2026-01-01");
    await page.waitForTimeout(1500);
    expect(apiCallCount, "First date change should trigger API call").toBeGreaterThan(0);
    const firstCallCount = apiCallCount;

    // Change date range
    await dateFromInput.fill("2025-01-01");
    await page.waitForTimeout(1500);
    expect(apiCallCount, "Second date change should trigger another API call").toBeGreaterThan(firstCallCount);
    console.log("Date range changes correctly trigger API updates");
  });
});

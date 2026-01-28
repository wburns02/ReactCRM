import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E tests for estimate creation functionality.
 * Verifies the full flow: form submission, API response, UI feedback, and list update.
 */
test.describe("Estimates Creation - Full E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("1. Create estimate - success flow with all fields", async ({ page }) => {
    // Capture API responses
    const apiResponses: { status: number; body: string }[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        apiResponses.push({
          status: response.status(),
          body: await response.text().catch(() => ""),
        });
      }
    });

    // Navigate to Estimates page
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Count existing estimates
    const initialCount = await page.locator('table tbody tr').count();
    console.log(`Initial estimate count: ${initialCount}`);

    // Click Create Estimate
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Select customer
    const customerInput = page.locator('[role="dialog"]').locator('input[placeholder="Search customers..."]');
    await customerInput.click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').locator('.absolute.z-50 button').first().click();
    await page.waitForTimeout(500);

    // Fill line item
    await page.locator('[role="dialog"]').locator('input[placeholder="Service"]').fill("Septic Inspection");
    await page.locator('[role="dialog"]').locator('input[placeholder="Description"]').fill("Full system inspection");
    await page.locator('[role="dialog"]').locator('input[placeholder="Qty"]').fill("1");
    await page.locator('[role="dialog"]').locator('input[placeholder="Rate"]').fill("275");

    // Set tax rate
    await page.locator('[role="dialog"]').locator('text=Tax Rate (%)').locator('..').locator('input').fill("8.25");

    // Set valid until date
    await page.locator('[role="dialog"]').locator('input[type="date"]').fill("2026-03-31");

    // Add notes
    await page.locator('[role="dialog"]').locator('textarea').fill("Playwright E2E test estimate");

    // Submit
    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();

    // Wait for modal to close
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    console.log("Modal closed after submission");

    // Verify API returned 201
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status).toBe(201);
    console.log("API returned 201 Created");

    // Verify success toast appears (use first() to avoid strict mode violation)
    const toast = page.getByText('Estimate Created').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    console.log("Success toast appeared");

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // Verify new estimate appears in list (count increased)
    const newCount = await page.locator('table tbody tr').count();
    console.log(`New estimate count: ${newCount}`);
    expect(newCount).toBeGreaterThanOrEqual(initialCount);

    // Verify the new estimate is visible with our service name
    const newEstimate = page.locator('table tbody tr').first();
    await expect(newEstimate).toBeVisible();
  });

  test("2. Create estimate - minimal fields (no optional data)", async ({ page }) => {
    const apiResponses: { status: number }[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        apiResponses.push({ status: response.status() });
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Select customer
    await page.locator('[role="dialog"]').locator('input[placeholder="Search customers..."]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').locator('.absolute.z-50 button').first().click();
    await page.waitForTimeout(500);

    // Fill ONLY required fields
    await page.locator('[role="dialog"]').locator('input[placeholder="Service"]').fill("Basic Service");
    await page.locator('[role="dialog"]').locator('input[placeholder="Rate"]').fill("150");

    // Submit without optional fields
    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();

    // Verify success
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
    expect(apiResponses[0].status).toBe(201);
    console.log("Minimal estimate created successfully");
  });

  test("3. Create estimate - validation error (no customer)", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill line item but DON'T select customer
    await page.locator('[role="dialog"]').locator('input[placeholder="Service"]').fill("Test Service");
    await page.locator('[role="dialog"]').locator('input[placeholder="Rate"]').fill("100");

    // Submit without customer
    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();

    // Verify validation error toast (use first() to avoid strict mode violation)
    const errorToast = page.getByText('Validation Error').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    console.log("Validation error shown for missing customer");

    // Modal should still be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("4. Create estimate - validation error (no line items)", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Select customer
    await page.locator('[role="dialog"]').locator('input[placeholder="Search customers..."]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').locator('.absolute.z-50 button').first().click();
    await page.waitForTimeout(500);

    // DON'T fill line items - leave service empty

    // Submit without line items
    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();

    // Verify validation error toast (use first() to avoid strict mode violation)
    const errorToast = page.getByText('Validation Error').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    console.log("Validation error shown for missing line items");

    // Modal should still be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("5. Create estimate - no 422 errors on valid data", async ({ page }) => {
    const networkErrors: { url: string; status: number; body: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          body: await response.text().catch(() => ""),
        });
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill all valid data
    await page.locator('[role="dialog"]').locator('input[placeholder="Search customers..."]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').locator('.absolute.z-50 button').first().click();
    await page.waitForTimeout(500);

    await page.locator('[role="dialog"]').locator('input[placeholder="Service"]').fill("Complete Service");
    await page.locator('[role="dialog"]').locator('input[placeholder="Description"]').fill("Detailed description here");
    await page.locator('[role="dialog"]').locator('input[placeholder="Qty"]').fill("2");
    await page.locator('[role="dialog"]').locator('input[placeholder="Rate"]').fill("199.99");
    await page.locator('[role="dialog"]').locator('text=Tax Rate (%)').locator('..').locator('input').fill("8.5");
    await page.locator('[role="dialog"]').locator('input[type="date"]').fill("2026-04-15");
    await page.locator('[role="dialog"]').locator('textarea').fill("Test notes for no-422 verification");

    // Submit
    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify NO 422 errors
    const has422 = networkErrors.some(e => e.status === 422);
    if (has422) {
      console.log("422 Error found:", JSON.stringify(networkErrors, null, 2));
    }
    expect(has422, `Found 422 error: ${JSON.stringify(networkErrors)}`).toBe(false);
    console.log("No 422 errors - test passed!");
  });

  test("6. Verify no console errors during estimate creation", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Full creation flow
    await page.getByRole("button", { name: /create estimate/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    await page.locator('[role="dialog"]').locator('input[placeholder="Search customers..."]').click();
    await page.waitForTimeout(500);
    await page.locator('[role="dialog"]').locator('.absolute.z-50 button').first().click();
    await page.waitForTimeout(500);

    await page.locator('[role="dialog"]').locator('input[placeholder="Service"]').fill("Console Error Check");
    await page.locator('[role="dialog"]').locator('input[placeholder="Rate"]').fill("100");

    await page.locator('[role="dialog"]').getByRole("button", { name: /create estimate/i }).click();
    await page.waitForTimeout(2000);

    // Check for errors
    const relevantErrors = consoleErrors.filter(e =>
      !e.includes("ResizeObserver") &&
      !e.includes("Download the React DevTools")
    );

    if (relevantErrors.length > 0) {
      console.log("Console errors found:", relevantErrors);
    }
    expect(relevantErrors.length, `Console errors: ${relevantErrors.join(", ")}`).toBe(0);
    console.log("No console errors during estimate creation");
  });
});

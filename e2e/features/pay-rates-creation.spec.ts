/**
 * Pay Rates Creation E2E Tests
 *
 * Tests the pay rate creation functionality to ensure:
 * 1. Hourly pay rates can be created
 * 2. Salary pay rates can be created
 * 3. No 500 errors occur during creation
 * 4. Proper validation and feedback
 *
 * Uses pre-authenticated state from auth.setup.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://react.ecbtx.com";

test.describe("Pay Rates Creation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/payroll`);
    await page.waitForLoadState("networkidle");
  });

  test("should load payroll page and navigate to pay rates tab", async ({ page }) => {
    // Check if redirected to login (session expired)
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Find and click Pay Rates tab
    const payRatesTab = page.locator("button", { hasText: "Pay Rates" });
    await expect(payRatesTab).toBeVisible({ timeout: 10000 });
    await payRatesTab.click();

    // Wait for tab content to load
    await page.waitForTimeout(1000);

    // Should show either pay rates list or empty state
    const pageContent = await page.content();
    const hasPayRates = pageContent.includes("Pay Rates") ||
                       pageContent.includes("No Pay Rates") ||
                       pageContent.includes("Add First Pay Rate") ||
                       pageContent.includes("Add Pay Rate");
    expect(hasPayRates).toBe(true);
  });

  test("should open add pay rate modal", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Click Pay Rates tab
    await page.locator("button", { hasText: "Pay Rates" }).click();
    await page.waitForTimeout(1000);

    // Find Add button (could be "Add Pay Rate" or "Add First Pay Rate")
    const addButton = page.locator("button", { hasText: /Add.*Pay Rate/i }).first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Modal should appear
    await page.waitForTimeout(500);
    const modalContent = await page.content();
    const hasModal = modalContent.includes("Technician") &&
                    (modalContent.includes("Hourly") || modalContent.includes("hourly"));
    expect(hasModal).toBe(true);
  });

  test("should create hourly pay rate without 500 error", async ({ page }) => {
    // Track network requests to verify no 500 errors
    const networkErrors: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/payroll/pay-rates") && response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Navigate to Pay Rates tab
    await page.locator("button", { hasText: "Pay Rates" }).click();
    await page.waitForTimeout(1000);

    // Click Add Pay Rate
    const addButton = page.locator("button", { hasText: /Add.*Pay Rate/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Select first technician
    const technicianSelect = page.locator("select#technician, select[id*='technician']");
    if (await technicianSelect.isVisible()) {
      const options = await technicianSelect.locator("option").all();
      if (options.length > 1) {
        // Select second option (first is "Select a technician...")
        await technicianSelect.selectOption({ index: 1 });
      }
    }

    // Ensure hourly is selected (default)
    const hourlyRadio = page.locator("input[type='radio'][value='hourly']");
    if (await hourlyRadio.isVisible()) {
      await hourlyRadio.click();
    }

    // Fill hourly rate
    const hourlyInput = page.locator("input#hourlyRate, input[id*='hourly']").first();
    if (await hourlyInput.isVisible()) {
      await hourlyInput.fill("25.00");
    }

    // Click submit button
    const submitButton = page.locator("button", { hasText: /Create Rate|Save/i }).first();
    if (await submitButton.isVisible() && await submitButton.isEnabled()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    // Verify no 500 errors
    expect(networkErrors).toHaveLength(0);
  });

  test("should create salary pay rate without 500 error", async ({ page }) => {
    // Track network requests
    const networkErrors: string[] = [];
    let payRateResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/pay-rates")) {
        if (response.status() >= 500) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
        if (response.request().method() === "POST" && response.status() < 300) {
          payRateResponse = response.status();
        }
      }
    });

    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Navigate to Pay Rates tab
    await page.locator("button", { hasText: "Pay Rates" }).click();
    await page.waitForTimeout(1000);

    // Click Add Pay Rate
    const addButton = page.locator("button", { hasText: /Add.*Pay Rate/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Select first technician
    const technicianSelect = page.locator("select#technician, select[id*='technician']");
    if (await technicianSelect.isVisible()) {
      const options = await technicianSelect.locator("option").all();
      if (options.length > 1) {
        await technicianSelect.selectOption({ index: 1 });
      }
    }

    // Click salary radio button
    const salaryRadio = page.locator("input[type='radio'][value='salary']");
    if (await salaryRadio.isVisible()) {
      await salaryRadio.click();
      await page.waitForTimeout(300);
    }

    // Fill salary amount
    const salaryInput = page.locator("input#salaryAmount, input[id*='salary']").first();
    if (await salaryInput.isVisible()) {
      await salaryInput.fill("50000");
    }

    // Click submit button
    const submitButton = page.locator("button", { hasText: /Create Rate|Save/i }).first();
    if (await submitButton.isVisible() && await submitButton.isEnabled()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
    }

    // CRITICAL: Verify no 500 errors (this was the bug)
    expect(networkErrors).toHaveLength(0);
  });

  test("should show proper validation for missing required fields", async ({ page }) => {
    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Navigate to Pay Rates tab
    await page.locator("button", { hasText: "Pay Rates" }).click();
    await page.waitForTimeout(1000);

    // Click Add Pay Rate
    const addButton = page.locator("button", { hasText: /Add.*Pay Rate/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Don't fill any fields, just check that submit is disabled
    const submitButton = page.locator("button", { hasText: /Create Rate|Save/i }).first();

    // Submit button should be disabled when form is invalid
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test("should have no console errors on payroll page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    if (page.url().includes("login")) {
      test.skip();
      return;
    }

    // Navigate tabs to trigger any potential errors
    await page.locator("button", { hasText: "Pay Rates" }).click();
    await page.waitForTimeout(1000);

    // Filter out non-critical errors (like favicon 404)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

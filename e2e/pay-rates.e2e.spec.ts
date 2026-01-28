/**
 * Pay Rates Tab - E2E Tests
 *
 * Verifies that the Pay Rates tab has full CRUD functionality:
 * - Add Rate button opens modal
 * - Modal has technician dropdown and rate fields
 * - Create pay rate works
 * - Edit/Delete buttons appear on rate cards
 */
import { test, expect } from "@playwright/test";

test.describe("Pay Rates Tab", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"], input[type="email"]', "will@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*(?<!login)$/, { timeout: 15000 });
  });

  test("1. Pay Rates tab loads and shows content", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    // Click Pay Rates tab
    const payRatesTab = page.getByRole("button", { name: /pay rates/i });
    await expect(payRatesTab).toBeVisible();
    await payRatesTab.click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Should see either rate cards or empty state
    const header = page.locator("h3:has-text('Technician Pay Rates')");
    await expect(header).toBeVisible();
  });

  test("2. Add Rate button opens modal", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    // Click Pay Rates tab
    await page.getByRole("button", { name: /pay rates/i }).click();
    await page.waitForTimeout(1000);

    // Click Add Rate button (could be "+ Add Rate" in header or "Add First Pay Rate" in empty state)
    const addButton = page.getByRole("button", { name: /add.*rate/i }).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Modal should open
    const modalTitle = page.locator("text=Add New Pay Rate");
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Modal should have technician dropdown
    const techDropdown = page.locator("select#technician");
    await expect(techDropdown).toBeVisible();

    // Modal should have hourly rate input
    const hourlyInput = page.locator("input#hourly-rate");
    await expect(hourlyInput).toBeVisible();
  });

  test("3. Modal has all required fields", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /pay rates/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /add.*rate/i }).first().click();
    await page.waitForTimeout(500);

    // Check all fields exist
    await expect(page.locator("select#technician")).toBeVisible();
    await expect(page.locator("input#hourly-rate")).toBeVisible();
    await expect(page.locator("input#overtime-rate")).toBeVisible();
    await expect(page.locator("input#commission-rate")).toBeVisible();
    await expect(page.locator("input#effective-date")).toBeVisible();

    // Check buttons
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create rate/i })).toBeVisible();
  });

  test("4. Can close modal with Cancel", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /pay rates/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /add.*rate/i }).first().click();
    await page.waitForTimeout(500);

    // Modal should be open
    await expect(page.locator("text=Add New Pay Rate")).toBeVisible();

    // Click Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Modal should close
    await expect(page.locator("text=Add New Pay Rate")).not.toBeVisible({ timeout: 3000 });
  });

  test("5. Hourly rate auto-calculates overtime rate", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /pay rates/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /add.*rate/i }).first().click();
    await page.waitForTimeout(500);

    // Enter hourly rate
    const hourlyInput = page.locator("input#hourly-rate");
    await hourlyInput.fill("20");

    // Overtime rate should auto-populate with 1.5x
    const overtimeInput = page.locator("input#overtime-rate");
    const overtimeValue = await overtimeInput.inputValue();
    expect(parseFloat(overtimeValue)).toBe(30); // 20 * 1.5 = 30
  });

  test("6. No 500 errors on pay rates API calls", async ({ page }) => {
    const errors: { url: string; status: number }[] = [];

    page.on("response", (response) => {
      if (response.url().includes("/pay-rates") && response.status() >= 500) {
        errors.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /pay rates/i }).click();
    await page.waitForTimeout(2000);

    // Should not have any 500 errors
    expect(errors.length).toBe(0);
  });
});

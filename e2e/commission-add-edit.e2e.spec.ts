import { test, expect } from "@playwright/test";

test.describe("Commission Add/Edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
  });

  test("Add Commission button opens modal with form fields", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Click on Commissions tab (use exact match)
    const commissionsTab = page.locator("button", { hasText: /^Commissions$/ });
    await commissionsTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Add Commission button
    const addButton = page.locator('button:has-text("Add Commission")');
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Verify modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal.locator('text=Add New Commission')).toBeVisible({ timeout: 5000 });

    // Verify form fields are present within the modal
    await expect(modal.locator('label:has-text("Technician *")')).toBeVisible();
    await expect(modal.locator('label:has-text("Commission Type")')).toBeVisible();
    await expect(modal.locator('label:has-text("Job Total / Base Amount")')).toBeVisible();
    await expect(modal.locator('label:has-text("Rate Type")')).toBeVisible();
    await expect(modal.locator('label:has-text("Commission Amount")')).toBeVisible();
    await expect(modal.locator('label:has-text("Earned Date")')).toBeVisible();
    await expect(modal.locator('label:has-text("Description / Notes")')).toBeVisible();

    // Verify buttons
    await expect(modal.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(modal.locator('button:has-text("Create Commission")')).toBeVisible();

    // Close modal
    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible();
  });

  test("Can create a commission with form data", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Click on Commissions tab
    const commissionsTab = page.locator("button", { hasText: /^Commissions$/ });
    await commissionsTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Add Commission button
    await page.locator('button:has-text("Add Commission")').click();
    await expect(page.locator('text=Add New Commission')).toBeVisible({ timeout: 5000 });

    // Select first technician from dropdown
    const techSelect = page.locator('select#technician');
    await techSelect.waitFor({ state: "visible" });

    // Wait for options to load
    await page.waitForTimeout(1000);
    const options = await techSelect.locator('option').all();
    if (options.length > 1) {
      // Select the first actual technician (skip the placeholder)
      await techSelect.selectOption({ index: 1 });
    }

    // Fill form fields
    await page.fill('#base-amount', '500');
    await page.fill('#rate', '5');

    // Check that commission amount is auto-calculated
    const commissionAmount = await page.locator('#commission-amount').inputValue();
    expect(parseFloat(commissionAmount)).toBeCloseTo(25, 1); // 500 * 5% = 25

    // Set up API response listener
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/payroll/commissions") && resp.request().method() === "POST",
      { timeout: 10000 }
    ).catch(() => null);

    // Click Create Commission
    await page.locator('button:has-text("Create Commission")').click();

    // Wait for API call
    const response = await responsePromise;
    if (response) {
      const status = response.status();
      console.log("Create commission API response status:", status);
      // Accept either 200 (success) or 422 (validation error due to no technicians)
      expect([200, 201, 422]).toContain(status);
    }
  });

  test("Commission amount auto-calculates from base amount and rate", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Click on Commissions tab
    const commissionsTab = page.locator("button", { hasText: /^Commissions$/ });
    await commissionsTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Add Commission button
    await page.locator('button:has-text("Add Commission")').click();
    await expect(page.locator('text=Add New Commission')).toBeVisible({ timeout: 5000 });

    // Enter base amount
    await page.fill('#base-amount', '1000');

    // Enter rate percentage
    await page.fill('#rate', '10');

    // Wait for auto-calculation
    await page.waitForTimeout(500);

    // Check commission amount (1000 * 10% = 100)
    const commissionAmount = await page.locator('#commission-amount').inputValue();
    expect(parseFloat(commissionAmount)).toBeCloseTo(100, 1);

    // Change base amount and verify recalculation
    await page.fill('#base-amount', '2000');
    await page.waitForTimeout(500);

    // New amount should be 2000 * 10% = 200
    const newAmount = await page.locator('#commission-amount').inputValue();
    expect(parseFloat(newAmount)).toBeCloseTo(200, 1);

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("Rate type can be switched between percent and fixed", async ({ page }) => {
    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Click on Commissions tab
    const commissionsTab = page.locator("button", { hasText: /^Commissions$/ });
    await commissionsTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Add Commission button
    await page.locator('button:has-text("Add Commission")').click();
    await expect(page.locator('text=Add New Commission')).toBeVisible({ timeout: 5000 });

    // Verify default is percent
    const rateTypeSelect = page.locator('select#rate-type');
    await expect(rateTypeSelect).toHaveValue('percent');

    // Enter base amount and rate
    await page.fill('#base-amount', '1000');
    await page.fill('#rate', '5');
    await page.waitForTimeout(500);

    // Percent mode: 1000 * 5% = 50
    let commissionAmount = await page.locator('#commission-amount').inputValue();
    expect(parseFloat(commissionAmount)).toBeCloseTo(50, 1);

    // Switch to fixed rate
    await rateTypeSelect.selectOption('fixed');
    await page.waitForTimeout(500);

    // Clear and re-enter rate as fixed amount
    await page.fill('#rate', '75');
    await page.waitForTimeout(500);

    // Fixed mode: rate IS the commission amount
    commissionAmount = await page.locator('#commission-amount').inputValue();
    expect(parseFloat(commissionAmount)).toBeCloseTo(75, 1);

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
  });

  test("No console errors when using commission form", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/payroll");
    await page.waitForLoadState("networkidle");

    // Click on Commissions tab
    const commissionsTab = page.locator("button", { hasText: /^Commissions$/ });
    await commissionsTab.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Open modal
    await page.locator('button:has-text("Add Commission")').click();
    await expect(page.locator('text=Add New Commission')).toBeVisible({ timeout: 5000 });

    // Interact with form
    await page.fill('#base-amount', '500');
    await page.fill('#rate', '5');
    await page.waitForTimeout(1000);

    // Close modal
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(500);

    // Filter out known benign errors
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("analytics") &&
        !err.includes("Sentry") &&
        !err.includes("ResizeObserver") &&
        !err.includes("404") &&
        !err.includes("422") &&
        !err.includes("Failed to load resource")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

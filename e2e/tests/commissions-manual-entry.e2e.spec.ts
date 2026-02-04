import { test, expect } from "@playwright/test";

/**
 * E2E tests for Manual Commission Entry with Pump Out / Service types
 *
 * Tests the new manual entry feature that supports:
 * - Pump Out: 20% commission on (Total - Dump Fees)
 * - Service: 15% commission on Total
 *
 * Login credentials:
 * Username: will@macseptic.com
 * Password: #Espn2025
 */

// Helper to login with required credentials
async function login(page: import("@playwright/test").Page) {
  await page.goto("https://react.ecbtx.com/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForURL(/\/(dashboard|payroll|customers)/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Manual Commission Entry - Pump Out & Service Types", () => {

  test("1. Navigate to Payroll Commissions tab", async ({ page }) => {
    await login(page);

    // Navigate to payroll page
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Verify we're on commissions tab
    const addCommissionBtn = page.getByRole("button", { name: /add.*commission/i });
    await expect(addCommissionBtn).toBeVisible({ timeout: 5000 });
    console.log("Successfully navigated to Commissions tab");
  });

  test("2. Open Add Commission modal and select Manual Entry", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Verify modal opened
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Select Manual Entry radio
    const manualRadio = page.getByText("Manual Entry");
    await expect(manualRadio).toBeVisible();
    await manualRadio.click();
    await page.waitForTimeout(500);

    console.log("Manual Entry mode selected");
  });

  test("3. Verify Pump Out and Service types are available", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Check commission type dropdown
    const typeSelect = page.locator('#commission-type');
    await expect(typeSelect).toBeVisible();

    // Get all options
    const options = await typeSelect.locator('option').allTextContents();
    console.log("Available commission types:", options);

    // Verify Pump Out and Service are available
    expect(options.some(opt => opt.includes("Pump Out"))).toBeTruthy();
    expect(options.some(opt => opt.includes("Service"))).toBeTruthy();

    console.log("Pump Out and Service types are available");
  });

  test("4. Select Pump Out - verify dump fees field appears", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Select Pump Out type
    await page.locator('#commission-type').selectOption('pump_out');
    await page.waitForTimeout(500);

    // Verify dump fees field is visible
    const dumpFeeInput = page.locator('#manual-dump-fee');
    await expect(dumpFeeInput).toBeVisible({ timeout: 5000 });

    console.log("Dump fees field is visible for Pump Out");
  });

  test("5. Pump Out auto-calc: (Total - Dump Fees) × 20%", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Select technician
    const techSelect = page.locator('#technician');
    await techSelect.selectOption({ index: 1 }); // Select first technician
    await page.waitForTimeout(300);

    // Select Pump Out type
    await page.locator('#commission-type').selectOption('pump_out');
    await page.waitForTimeout(500);

    // Enter base amount: $500
    await page.locator('#base-amount').fill('500');
    await page.waitForTimeout(300);

    // Enter dump fees: $100
    await page.locator('#manual-dump-fee').fill('100');
    await page.waitForTimeout(500);

    // Verify calculation: ($500 - $100) × 20% = $80
    const commissionInput = page.locator('#commission-amount');
    const commissionValue = await commissionInput.inputValue();
    console.log(`Calculated commission: $${commissionValue}`);

    // Should be $80.00
    expect(parseFloat(commissionValue)).toBeCloseTo(80, 0);

    // Verify calculation preview is shown
    const preview = page.locator('text=Commission Preview');
    await expect(preview).toBeVisible();

    console.log("Pump Out auto-calc verified: (500 - 100) × 20% = $80");
  });

  test("6. Select Service - verify dump fees field is hidden", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // First select Pump Out to show dump fees
    await page.locator('#commission-type').selectOption('pump_out');
    await page.waitForTimeout(300);

    // Verify dump fees visible
    let dumpFeeInput = page.locator('#manual-dump-fee');
    await expect(dumpFeeInput).toBeVisible();

    // Now select Service
    await page.locator('#commission-type').selectOption('service');
    await page.waitForTimeout(500);

    // Verify dump fees is now hidden
    dumpFeeInput = page.locator('#manual-dump-fee');
    await expect(dumpFeeInput).not.toBeVisible();

    console.log("Dump fees field is correctly hidden for Service type");
  });

  test("7. Service auto-calc: Total × 15%", async ({ page }) => {
    await login(page);
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Select technician
    const techSelect = page.locator('#technician');
    await techSelect.selectOption({ index: 1 }); // Select first technician
    await page.waitForTimeout(300);

    // Select Service type
    await page.locator('#commission-type').selectOption('service');
    await page.waitForTimeout(500);

    // Enter base amount: $300
    await page.locator('#base-amount').fill('300');
    await page.waitForTimeout(500);

    // Verify calculation: $300 × 15% = $45
    const commissionInput = page.locator('#commission-amount');
    const commissionValue = await commissionInput.inputValue();
    console.log(`Calculated commission: $${commissionValue}`);

    // Should be $45.00
    expect(parseFloat(commissionValue)).toBeCloseTo(45, 0);

    // Verify calculation preview
    const preview = page.locator('text=Commission Preview');
    await expect(preview).toBeVisible();

    console.log("Service auto-calc verified: 300 × 15% = $45");
  });

  test("8. Submit Pump Out commission successfully", async ({ page }) => {
    await login(page);

    // Track network requests
    let createRequest: { status: number; url: string } | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/payroll/commissions") &&
          response.request().method() === "POST") {
        createRequest = {
          url: response.url(),
          status: response.status(),
        };
        console.log(`POST /commissions response: ${response.status()}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Select technician
    const techSelect = page.locator('#technician');
    await techSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Select Pump Out type
    await page.locator('#commission-type').selectOption('pump_out');
    await page.waitForTimeout(300);

    // Enter base amount
    await page.locator('#base-amount').fill('500');
    await page.waitForTimeout(200);

    // Enter dump fees
    await page.locator('#manual-dump-fee').fill('100');
    await page.waitForTimeout(500);

    // Add description
    await page.locator('#description').fill('E2E Test - Pump Out commission');
    await page.waitForTimeout(200);

    // Submit
    await page.getByRole("button", { name: /create commission/i }).click();
    await page.waitForTimeout(2000);

    // Verify success
    if (createRequest) {
      expect(createRequest.status).toBe(200);
      console.log("Pump Out commission created successfully");
    }

    // Verify modal closed (success)
    const modal = page.getByRole("dialog");
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    console.log("Pump Out commission submitted successfully");
  });

  test("9. Submit Service commission successfully", async ({ page }) => {
    await login(page);

    // Track network requests
    let createRequest: { status: number; url: string } | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/payroll/commissions") &&
          response.request().method() === "POST") {
        createRequest = {
          url: response.url(),
          status: response.status(),
        };
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click Commissions tab
    await page.getByRole("button", { name: "Commissions" }).click();
    await page.waitForTimeout(2000);

    // Click Add Commission button
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(500);

    // Select technician
    const techSelect = page.locator('#technician');
    await techSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Select Service type
    await page.locator('#commission-type').selectOption('service');
    await page.waitForTimeout(300);

    // Enter base amount
    await page.locator('#base-amount').fill('300');
    await page.waitForTimeout(500);

    // Add description
    await page.locator('#description').fill('E2E Test - Service commission');
    await page.waitForTimeout(200);

    // Submit
    await page.getByRole("button", { name: /create commission/i }).click();
    await page.waitForTimeout(2000);

    // Verify success
    if (createRequest) {
      expect(createRequest.status).toBe(200);
      console.log("Service commission created successfully");
    }

    // Verify modal closed (success)
    const modal = page.getByRole("dialog");
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    console.log("Service commission submitted successfully");
  });

  test("10. No console errors during commission workflow", async ({ page }) => {
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

    // Open modal
    await page.getByRole("button", { name: /add.*commission/i }).click();
    await page.waitForTimeout(500);

    // Select Manual Entry
    await page.getByText("Manual Entry").click();
    await page.waitForTimeout(300);

    // Select Pump Out
    await page.locator('#commission-type').selectOption('pump_out');
    await page.waitForTimeout(300);

    // Fill fields
    await page.locator('#base-amount').fill('500');
    await page.locator('#manual-dump-fee').fill('100');
    await page.waitForTimeout(500);

    // Select Service
    await page.locator('#commission-type').selectOption('service');
    await page.waitForTimeout(500);

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(500);

    // Check for errors
    if (consoleErrors.length > 0) {
      console.log("Console errors found:", consoleErrors);
    }
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join("; ")}`).toBe(0);

    console.log("No console errors during commission workflow");
  });
});

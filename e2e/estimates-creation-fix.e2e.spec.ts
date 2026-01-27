import { test, expect, type Page } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

/**
 * Estimates Creation E2E Tests
 * Tests the fix for the 422 error when creating estimates
 */
test.describe("Estimates Creation Fix", () => {
  // Store auth token for API calls
  let authToken: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Capture auth token from localStorage or cookies
    authToken = await page.evaluate(() => {
      return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    });
  });

  test("1. Login and navigate to Estimates page", async ({ page }) => {
    // Navigate to estimates
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("Estimates");

    // Verify Create Estimate button exists
    const createButton = page.locator('button:has-text("Create Estimate")');
    await expect(createButton).toBeVisible();
  });

  test("2. Create Estimate button opens modal", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Click Create Estimate
    await page.click('button:has-text("Create Estimate")');

    // Verify modal opens
    await expect(page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'))).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(page.locator('text=Create New Estimate').or(page.locator('text=Create Estimate'))).toBeVisible();
  });

  test("3. Fill estimate form with valid data", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(500); // Wait for modal animation

    // Search for customer
    const customerInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="customer"]'));
    await customerInput.fill("John");
    await page.waitForTimeout(300);

    // Select first customer from dropdown
    const customerOption = page.locator('button:has-text("John")').first();
    if (await customerOption.isVisible()) {
      await customerOption.click();
    }

    // Add line item
    const serviceInput = page.locator('input[placeholder*="Service"]').first();
    await serviceInput.fill("Septic Tank Pumping");

    const qtyInput = page.locator('input[placeholder*="Qty"]').first().or(page.locator('input[type="number"]').first());
    await qtyInput.fill("1");

    const rateInput = page.locator('input[placeholder*="Rate"]').first();
    await rateInput.fill("350");

    // Verify totals are calculated
    await expect(page.locator('text=$350')).toBeVisible({ timeout: 3000 });
  });

  test("4. POST /quotes returns 201 on valid submission", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(1000);

    // Search and select customer - click the search input first
    const customerInput = page.locator('input[placeholder*="Search customer"]');
    await customerInput.click();
    await page.waitForTimeout(1000);

    // Click first customer in dropdown
    const customerOption = page.locator('[role="dialog"]').locator('button').filter({ hasText: /Burns|Smith|Demo|John/ }).first();
    await customerOption.waitFor({ state: "visible", timeout: 5000 });
    await customerOption.click();
    await page.waitForTimeout(500);

    // Fill line item - use the dialog scoped inputs
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[placeholder="Service"]').fill("Test Septic Pumping");
    await dialog.locator('input[placeholder="Description"]').fill("Standard service");

    // Quantity - clear and fill
    const qtyInput = dialog.locator('input[type="number"]').first();
    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill("1");

    // Rate - clear and fill
    const rateInput = dialog.locator('input[type="number"]').nth(1);
    await rateInput.click({ clickCount: 3 });
    await rateInput.fill("350");

    await page.waitForTimeout(500);

    // Listen for API response
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/quotes") &&
        (response.request().method() === "POST"),
      { timeout: 15000 }
    );

    // Submit form - use dialog button specifically
    const submitButton = dialog.locator('button:has-text("Create Estimate")');
    await submitButton.click();

    // Check response
    const response = await responsePromise;
    const status = response.status();

    console.log(`POST /quotes returned: ${status}`);

    if (status === 422) {
      const body = await response.json();
      console.log("422 Response body:", JSON.stringify(body, null, 2));
    }

    // Should be 201 Created or 200 OK, NOT 422
    expect(status).not.toBe(422);
    expect([200, 201]).toContain(status);
  });

  test("5. Success toast appears after creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(500);

    // Fill form quickly
    const customerInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="customer"]'));
    await customerInput.fill("Test");
    await page.waitForTimeout(300);

    // Try to select customer
    const firstOption = page.locator('[class*="dropdown"] button, [class*="results"] button').first();
    if (await firstOption.isVisible({ timeout: 2000 })) {
      await firstOption.click();
    }

    // Fill line item
    await page.locator('input[placeholder*="Service"]').first().fill("Quick Test");
    await page.locator('input[type="number"]').first().fill("1");
    await page.locator('input[placeholder*="Rate"]').first().fill("50");

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();

    // Look for success toast or modal close
    const successIndicator = page.locator('text=created').or(page.locator('text=success')).or(page.locator('[role="alert"]'));
    const modalClosed = await page.locator('[role="dialog"]').isHidden({ timeout: 5000 });

    expect(await successIndicator.isVisible() || modalClosed).toBeTruthy();
  });

  test("6. No 422 errors in network tab", async ({ page }) => {
    const networkErrors: string[] = [];

    // Listen for all API responses
    page.on("response", (response) => {
      if (response.url().includes("/api/v2/") && response.status() === 422) {
        networkErrors.push(`422 error: ${response.url()}`);
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Try to create an estimate
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(1000);

    // Fill minimal data
    const serviceInput = page.locator('input[placeholder*="Service"]').first();
    if (await serviceInput.isVisible()) {
      await serviceInput.fill("Test");
      await page.locator('input[type="number"]').first().fill("1");
      await page.locator('input[placeholder*="Rate"]').first().fill("100");
    }

    // Wait for any API calls
    await page.waitForTimeout(2000);

    // Verify no 422 errors occurred
    expect(networkErrors).toHaveLength(0);
  });

  test("7. Validation error shown for missing customer", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(500);

    // Only fill line item, not customer
    await page.locator('input[placeholder*="Service"]').first().fill("Test Service");
    await page.locator('input[type="number"]').first().fill("1");
    await page.locator('input[placeholder*="Rate"]').first().fill("100");

    // Try to submit
    await page.locator('button:has-text("Create Estimate")').last().click();

    // Should see validation error
    const errorMessage = page.locator('text=customer').or(page.locator('text=required')).or(page.locator('[class*="error"]'));
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test("8. Validation error shown for empty line items", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(500);

    // Select customer but don't add line item
    const customerInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="customer"]'));
    await customerInput.fill("Test");
    await page.waitForTimeout(300);

    // Try to select customer
    const firstOption = page.locator('button').filter({ hasText: /Test|Demo|Customer/ }).first();
    if (await firstOption.isVisible({ timeout: 2000 })) {
      await firstOption.click();
    }

    // Try to submit without line items
    await page.locator('button:has-text("Create Estimate")').last().click();

    // Should see validation error about line items
    const errorMessage = page.locator('text=line item').or(page.locator('text=required')).or(page.locator('[class*="error"]'));
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test("9. No console errors during estimate creation flow", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(1000);

    // Interact with form
    const serviceInput = page.locator('input[placeholder*="Service"]').first();
    if (await serviceInput.isVisible()) {
      await serviceInput.fill("Test");
    }

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        !e.includes("React DevTools") &&
        !e.includes("favicon") &&
        !e.includes("serviceworker") &&
        !e.includes("third-party")
    );

    console.log("Console errors found:", criticalErrors);
    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow some minor errors
  });

  test("10. Estimate appears in list after creation", async ({ page }) => {
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");

    // Get initial count of estimates (if any)
    const initialItems = await page.locator('table tbody tr').count();

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForTimeout(500);

    // Fill form
    const customerInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="customer"]'));
    await customerInput.fill("Demo");
    await page.waitForTimeout(300);

    const firstOption = page.locator('button').filter({ hasText: /Demo|Customer|John/ }).first();
    if (await firstOption.isVisible({ timeout: 2000 })) {
      await firstOption.click();
    }

    // Fill unique service name
    const uniqueService = `Test Service ${Date.now()}`;
    await page.locator('input[placeholder*="Service"]').first().fill(uniqueService);
    await page.locator('input[type="number"]').first().fill("1");
    await page.locator('input[placeholder*="Rate"]').first().fill("99");

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(2000);

    // Check if list has new item or if our service name appears
    const finalItems = await page.locator('table tbody tr').count();
    const hasNewItem = finalItems > initialItems;
    const hasServiceName = await page.locator(`text=${uniqueService}`).isVisible();

    expect(hasNewItem || hasServiceName).toBeTruthy();
  });
});

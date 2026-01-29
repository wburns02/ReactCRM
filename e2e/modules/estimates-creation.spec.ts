import { test, expect } from "@playwright/test";

/**
 * Estimates Creation E2E Tests
 * 
 * Verifies that estimate creation works correctly:
 * - Modal opens
 * - Form submits successfully
 * - 201 response from POST /api/v2/quotes/
 * - Success toast displayed
 * - New estimate appears in list
 * - No 422 errors
 */
test.describe("Estimates Creation", () => {
  test("creates estimate successfully with customer and line items", async ({ page }) => {
    // Track network responses
    let quotePostStatus: number | null = null;
    let quotePostBody: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        quotePostStatus = response.status();
        try {
          quotePostBody = await response.json();
        } catch {
          quotePostBody = await response.text();
        }
      }
    });

    // Navigate to Estimates page
    await page.goto("/estimates");
    await page.waitForLoadState("networkidle");

    // Wait for the page to be ready
    await expect(page.locator("h1")).toContainText("Estimates");

    // Click Create Estimate button
    const createBtn = page.getByRole("button", { name: /Create Estimate/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Wait for modal to open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Create New Estimate")).toBeVisible();

    // Select a customer
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);

    // Select first available customer
    const customerOption = page.locator('[class*="option"]').first();
    await expect(customerOption).toBeVisible({ timeout: 5000 });
    await customerOption.click();
    await page.waitForTimeout(300);

    // Fill line item - Service
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.fill("Septic System Inspection");

    // Fill line item - Rate (second number input)
    const rateInput = page.locator('input[type="number"]').nth(1);
    await rateInput.fill("275");

    // Verify line total is calculated
    await expect(page.getByText("Line total: $275.00")).toBeVisible();

    // Submit the form
    const submitBtn = page.getByRole("button", { name: /Create Estimate/i }).last();
    await submitBtn.click();

    // Wait for the request to complete
    await page.waitForTimeout(2000);

    // CRITICAL ASSERTIONS

    // 1. Verify POST was successful (201 Created)
    expect(quotePostStatus).toBe(201);
    console.log("✅ POST /quotes/ returned 201 Created");

    // 2. Verify response contains quote data
    expect(quotePostBody).toBeTruthy();
    expect(quotePostBody.id).toBeTruthy();
    expect(quotePostBody.quote_number).toMatch(/^Q-/);
    console.log(`✅ Created estimate: ${quotePostBody.quote_number}`);

    // 3. Verify success toast appeared
    await expect(page.getByText("Estimate Created")).toBeVisible({ timeout: 5000 });
    console.log("✅ Success toast displayed");

    // 4. Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    console.log("✅ Modal closed after submission");

    // 5. New estimate should appear in list (page should refresh)
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${quotePostBody.quote_number}`).or(page.locator("text=$275.00"))).toBeVisible({ timeout: 5000 });
    console.log("✅ New estimate visible in list");
  });

  test("shows validation error when customer not selected", async ({ page }) => {
    await page.goto("/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    const createBtn = page.getByRole("button", { name: /Create Estimate/i });
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill only line item (no customer)
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.fill("Test Service");
    const rateInput = page.locator('input[type="number"]').nth(1);
    await rateInput.fill("100");

    // Try to submit
    const submitBtn = page.getByRole("button", { name: /Create Estimate/i }).last();
    await submitBtn.click();

    // Should show validation error
    await expect(page.getByText("Please select a customer")).toBeVisible({ timeout: 3000 });
    console.log("✅ Validation error shown for missing customer");

    // Modal should stay open
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("shows validation error when no line items", async ({ page }) => {
    await page.goto("/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    const createBtn = page.getByRole("button", { name: /Create Estimate/i });
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select customer
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);
    const customerOption = page.locator('[class*="option"]').first();
    await customerOption.click();
    await page.waitForTimeout(300);

    // Don't fill any line items (leave service empty)
    // Try to submit
    const submitBtn = page.getByRole("button", { name: /Create Estimate/i }).last();
    await submitBtn.click();

    // Should show validation error for line items
    await expect(page.getByText("Please add at least one line item")).toBeVisible({ timeout: 3000 });
    console.log("✅ Validation error shown for missing line items");
  });

  test("no 422 errors in network", async ({ page }) => {
    let has422Error = false;

    page.on("response", (response) => {
      if (response.status() === 422) {
        console.error(`422 Error: ${response.url()}`);
        has422Error = true;
      }
    });

    await page.goto("/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    const createBtn = page.getByRole("button", { name: /Create Estimate/i });
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select customer
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);
    const customerOption = page.locator('[class*="option"]').first();
    await customerOption.click();
    await page.waitForTimeout(300);

    // Fill line item
    await page.locator('input[placeholder="Service"]').first().fill("Grease Trap Cleaning");
    await page.locator('input[type="number"]').nth(1).fill("450");

    // Submit
    await page.getByRole("button", { name: /Create Estimate/i }).last().click();
    await page.waitForTimeout(2000);

    // Verify no 422 errors occurred
    expect(has422Error).toBe(false);
    console.log("✅ No 422 errors in network requests");
  });

  test("no console errors during estimate creation", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/estimates");
    await page.waitForLoadState("networkidle");

    // Create an estimate
    const createBtn = page.getByRole("button", { name: /Create Estimate/i });
    await createBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill form
    const customerSearch = page.locator('input[placeholder="Search customers..."]');
    await customerSearch.click();
    await page.waitForTimeout(500);
    await page.locator('[class*="option"]').first().click();
    await page.waitForTimeout(300);

    await page.locator('input[placeholder="Service"]').first().fill("Tank Pumping");
    await page.locator('input[type="number"]').nth(1).fill("350");

    // Submit
    await page.getByRole("button", { name: /Create Estimate/i }).last().click();
    await page.waitForTimeout(2000);

    // Verify no console errors
    if (consoleErrors.length > 0) {
      console.log("Console errors found:", consoleErrors);
    }
    expect(consoleErrors).toHaveLength(0);
    console.log("✅ No console errors during estimate creation");
  });
});

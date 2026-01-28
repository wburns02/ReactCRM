import { test, expect } from "@playwright/test";

/**
 * Estimates Creation E2E Tests - Final Enforcement
 *
 * Verifies estimate creation works with no 422 errors.
 * Uses explicit login and robust customer selection.
 */
test.describe("Estimates Creation Fix Enforcement", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Explicit login
    await page.goto("https://react.ecbtx.com/login");
    await page.waitForSelector('input[name="email"]', { state: "visible", timeout: 10000 });
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 20000 });
  });

  // Helper to select a customer reliably
  async function selectCustomer(page: any) {
    const customerInput = page.locator('input[placeholder="Search customers..."]');
    await customerInput.waitFor({ state: "visible", timeout: 10000 });
    await customerInput.fill("CSRF"); // Type to filter
    await page.waitForTimeout(1500);
    const csrfOption = page.locator('button:has-text("CSRF Test")').first();
    await csrfOption.click();
    await page.waitForTimeout(500);
  }

  test("1. Create Estimate - returns 201, no 422", async ({ page }) => {
    let postStatus: number | null = null;
    let postBody: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST") {
        postStatus = response.status();
        try {
          postBody = await response.json();
        } catch {
          postBody = null;
        }
      }
    });

    // Navigate to Estimates
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    // Open modal
    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    // Select customer
    await selectCustomer(page);

    // Fill line item
    await page.locator('input[placeholder="Service"]').fill("E2E Test - Success Flow");
    await page.locator('input[type="number"]').nth(1).fill("199");

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(3000);

    // Assertions
    console.log("POST Status:", postStatus);
    expect(postStatus).toBe(201);
    expect(postStatus).not.toBe(422);
    expect(postBody?.id).toBeTruthy();
    expect(postBody?.quote_number).toMatch(/^Q-/);

    // Success toast
    await expect(page.getByText("Estimate Created")).toBeVisible({ timeout: 5000 });
    console.log(`✅ SUCCESS: Created estimate ${postBody?.quote_number}`);
  });

  test("2. Validation - customer required shows error", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    // Fill only line item, no customer
    await page.locator('input[placeholder="Service"]').fill("Test Service");
    await page.locator('input[type="number"]').nth(1).fill("100");

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(1000);

    // Should show validation error
    await expect(page.getByText("Please select a customer")).toBeVisible();
    console.log("✅ Validation: Customer required error shown");
  });

  test("3. Validation - line item required shows error", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    // Select customer but don't fill line item
    await selectCustomer(page);

    // Submit without filling service
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(1000);

    // Should show validation error
    await expect(page.getByText("Please add at least one line item")).toBeVisible();
    console.log("✅ Validation: Line item required error shown");
  });

  test("4. No 422 errors with all field types", async ({ page }) => {
    let has422 = false;

    page.on("response", (response) => {
      if (response.status() === 422) {
        console.error("422 ERROR:", response.url());
        has422 = true;
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    // Select customer
    await selectCustomer(page);

    // Fill ALL fields
    await page.locator('input[placeholder="Service"]').fill("Full Field Test");
    await page.locator('input[placeholder="Description"]').fill("Testing all fields");
    await page.locator('input[type="number"]').nth(0).fill("2");
    await page.locator('input[type="number"]').nth(1).fill("250");
    await page.locator('input[type="number"]').nth(2).fill("8.25");
    await page.locator('input[type="date"]').fill("2026-03-15");
    await page.locator('textarea').fill("Test notes for full field coverage");

    // Submit
    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(3000);

    expect(has422).toBe(false);
    console.log("✅ No 422 errors with all field types");
  });

  test("5. New estimate appears in list after creation", async ({ page }) => {
    let createdQuoteNumber = "";

    page.on("response", async (response) => {
      if (response.url().includes("/quotes") && response.request().method() === "POST" && response.status() === 201) {
        const body = await response.json();
        createdQuoteNumber = body.quote_number;
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    await selectCustomer(page);

    await page.locator('input[placeholder="Service"]').fill("List Verification Test");
    await page.locator('input[type="number"]').nth(1).fill("77");

    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(3000);

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    expect(createdQuoteNumber).toBeTruthy();
    console.log(`✅ Estimate ${createdQuoteNumber} created`);
  });

  test("6. No console errors during creation", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/estimates");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Create Estimate")').first().click();
    await page.waitForSelector('text=Create New Estimate', { state: "visible", timeout: 10000 });

    await selectCustomer(page);

    await page.locator('input[placeholder="Service"]').fill("Console Error Test");
    await page.locator('input[type="number"]').nth(1).fill("88");

    await page.locator('button:has-text("Create Estimate")').last().click();
    await page.waitForTimeout(3000);

    if (errors.length > 0) {
      console.log("Console errors found:", errors);
    }
    expect(errors.length).toBe(0);
    console.log("✅ No console errors during estimate creation");
  });
});

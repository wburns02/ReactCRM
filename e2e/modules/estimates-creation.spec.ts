import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Estimate Creation Fix
 * Verifies that the Create Estimate button opens a modal,
 * form submission works, and estimate is created successfully.
 */

const BASE_URL = "https://react.ecbtx.com";

// Login credentials
const TEST_USER = {
  email: "will@macseptic.com",
  password: "#Espn2025",
};

test.describe("Estimate Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    // Navigate to Estimates page
    await page.goto(`${BASE_URL}/estimates`);
    await page.waitForLoadState("networkidle");
  });

  test("Create Estimate button opens modal", async ({ page }) => {
    // Click Create Estimate button
    const createButton = page.locator('button:has-text("Create Estimate")');
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Verify modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal header
    const modalHeader = modal.locator('text=Create New Estimate');
    await expect(modalHeader).toBeVisible();

    // Verify customer select is present
    const customerSelect = modal.locator('input[placeholder="Search customers..."]');
    await expect(customerSelect).toBeVisible();
  });

  test("Can fill estimate form", async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Search and select a customer
    const customerInput = page.locator('input[placeholder="Search customers..."]');
    await customerInput.fill("test");
    await page.waitForTimeout(500); // Wait for search results

    // Click first customer result if available
    const customerResult = page.locator('[role="dialog"] button.w-full.px-4.py-2').first();
    if (await customerResult.isVisible()) {
      await customerResult.click();
    }

    // Fill line item
    const serviceInput = page.locator('input[placeholder="Service"]').first();
    await serviceInput.fill("Septic Pumping");

    const descriptionInput = page.locator('input[placeholder="Description"]').first();
    await descriptionInput.fill("Standard tank pumping");

    const qtyInput = page.locator('input[placeholder="Qty"]').first();
    await qtyInput.fill("1");

    const rateInput = page.locator('input[placeholder="Rate"]').first();
    await rateInput.fill("350");

    // Verify total is calculated
    const totalText = page.locator('[role="dialog"]').locator('text=$350.00');
    await expect(totalText.first()).toBeVisible();
  });

  test("Create Estimate form submission works", async ({ page }) => {
    // Setup network listener for API call
    const quoteCreationPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/quotes") &&
        response.request().method() === "POST",
      { timeout: 10000 }
    );

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Search and select a customer
    const customerInput = page.locator('input[placeholder="Search customers..."]');
    await customerInput.fill("a"); // Search for any customer
    await page.waitForTimeout(1000);

    // Select first customer
    const customerResult = page.locator('[role="dialog"] button.w-full.px-4.py-2').first();
    await expect(customerResult).toBeVisible({ timeout: 5000 });
    await customerResult.click();

    // Fill line item
    await page.locator('input[placeholder="Service"]').first().fill("Test Service");
    await page.locator('input[placeholder="Qty"]').first().fill("1");
    await page.locator('input[placeholder="Rate"]').first().fill("100");

    // Click Create Estimate button in modal
    const submitButton = page.locator('[role="dialog"] button:has-text("Create Estimate")');
    await submitButton.click();

    // Wait for API response
    let response;
    try {
      response = await quoteCreationPromise;
    } catch {
      // If no response, check if there's an error toast
      const errorToast = page.locator('[role="alert"]:has-text("Error")');
      if (await errorToast.isVisible()) {
        const errorMessage = await errorToast.textContent();
        console.log("Error toast message:", errorMessage);
      }
      throw new Error("Quote creation API call did not complete");
    }

    // Verify response status
    const status = response.status();
    console.log(`POST /quotes response status: ${status}`);

    // Assert not 422 error
    expect(status).not.toBe(422);

    // Assert success (200 or 201)
    expect([200, 201]).toContain(status);
  });

  test("Shows success toast on estimate creation", async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Search and select a customer
    await page.locator('input[placeholder="Search customers..."]').fill("a");
    await page.waitForTimeout(1000);

    const customerResult = page.locator('[role="dialog"] button.w-full.px-4.py-2').first();
    if (await customerResult.isVisible()) {
      await customerResult.click();
    } else {
      test.skip(true, "No customers available to test with");
      return;
    }

    // Fill line item
    await page.locator('input[placeholder="Service"]').first().fill("E2E Test Service");
    await page.locator('input[placeholder="Qty"]').first().fill("1");
    await page.locator('input[placeholder="Rate"]').first().fill("250");

    // Submit
    await page.locator('[role="dialog"] button:has-text("Create Estimate")').click();

    // Check for success toast
    const successToast = page.locator('[role="alert"]:has-text("Estimate Created")');
    await expect(successToast).toBeVisible({ timeout: 10000 });
  });

  test("Modal closes after successful creation", async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Fill form
    await page.locator('input[placeholder="Search customers..."]').fill("a");
    await page.waitForTimeout(1000);

    const customerResult = page.locator('[role="dialog"] button.w-full.px-4.py-2').first();
    if (await customerResult.isVisible()) {
      await customerResult.click();
    } else {
      test.skip(true, "No customers available");
      return;
    }

    await page.locator('input[placeholder="Service"]').first().fill("Close Test");
    await page.locator('input[placeholder="Qty"]').first().fill("1");
    await page.locator('input[placeholder="Rate"]').first().fill("100");

    // Submit
    await page.locator('[role="dialog"] button:has-text("Create Estimate")').click();

    // Modal should close on success
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible({ timeout: 10000 });
  });

  test("Shows validation error when customer not selected", async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Fill line item but don't select customer
    await page.locator('input[placeholder="Service"]').first().fill("Test");
    await page.locator('input[placeholder="Qty"]').first().fill("1");
    await page.locator('input[placeholder="Rate"]').first().fill("100");

    // Try to submit without customer
    await page.locator('[role="dialog"] button:has-text("Create Estimate")').click();

    // Should show validation error
    const errorToast = page.locator('[role="alert"]:has-text("Validation Error")');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });

  test("No 422 errors in network", async ({ page }) => {
    const errors422: string[] = [];

    // Listen for 422 responses
    page.on("response", (response) => {
      if (response.status() === 422) {
        errors422.push(`${response.request().method()} ${response.url()} - 422`);
      }
    });

    // Open modal
    await page.click('button:has-text("Create Estimate")');
    await page.waitForSelector('[role="dialog"]');

    // Fill valid form
    await page.locator('input[placeholder="Search customers..."]').fill("a");
    await page.waitForTimeout(1000);

    const customerResult = page.locator('[role="dialog"] button.w-full.px-4.py-2').first();
    if (await customerResult.isVisible()) {
      await customerResult.click();
    }

    await page.locator('input[placeholder="Service"]').first().fill("No 422 Test");
    await page.locator('input[placeholder="Qty"]').first().fill("1");
    await page.locator('input[placeholder="Rate"]').first().fill("100");

    // Submit
    await page.locator('[role="dialog"] button:has-text("Create Estimate")').click();

    // Wait for submission
    await page.waitForTimeout(3000);

    // Assert no 422 errors
    expect(errors422).toHaveLength(0);
  });
});

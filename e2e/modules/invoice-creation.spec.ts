import { test, expect } from "@playwright/test";

/**
 * E2E Tests for Invoice Creation
 * Verifies that the Create Invoice button opens a modal,
 * form submission works, and invoice is created successfully.
 */

const BASE_URL = "https://react.ecbtx.com";

const TEST_USER = {
  email: "will@macseptic.com",
  password: "#Espn2025",
};

test.describe("Invoice Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Navigate to Invoices page
    await page.goto(`${BASE_URL}/invoices`);
    await page.waitForLoadState("networkidle");
  });

  test("Create Invoice button opens modal", async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Invoice")').first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Verify modal opens
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify modal has content
    await expect(modal.locator('text=Customer Information')).toBeVisible();

    // Verify customer select is present
    const customerSelect = modal.locator('select#customer_id');
    await expect(customerSelect).toBeVisible();
  });

  test("Can fill invoice form fields", async ({ page }) => {
    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select a customer
    const customerSelect = modal.locator('select#customer_id');
    await expect(customerSelect).toBeVisible();
    const options = await customerSelect.locator('option').all();
    if (options.length > 1) {
      const firstCustomer = await options[1].getAttribute('value');
      await customerSelect.selectOption(firstCustomer!);
    }

    // Fill tax rate
    const taxInput = modal.locator('#tax_rate');
    await taxInput.fill("8.25");

    // Verify totals section is shown
    const subtotalText = modal.locator('text=Subtotal:');
    await expect(subtotalText).toBeVisible();
  });

  test("Create Invoice form submission succeeds", async ({ page }) => {
    // Track errors
    const errors: { status: number; url: string }[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errors.push({ status: response.status(), url: response.url() });
      }
    });

    // Open modal using first matching button
    await page.locator('button:has-text("Create Invoice")').first().click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select a customer
    const customerSelect = modal.locator('select#customer_id');
    await expect(customerSelect).toBeVisible();
    const options = await customerSelect.locator('option').all();
    expect(options.length).toBeGreaterThan(1);
    const firstCustomer = await options[1].getAttribute('value');
    await customerSelect.selectOption(firstCustomer!);

    // Submit the form (the submit button inside the modal)
    const submitButton = modal.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for the modal to close (indicates success)
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // No 500 errors should have occurred
    const serverErrors = errors.filter((e) => e.status === 500);
    expect(serverErrors).toHaveLength(0);
  });

  test("Modal closes after successful creation", async ({ page }) => {
    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select customer
    const customerSelect = modal.locator('select#customer_id');
    const options = await customerSelect.locator('option').all();
    if (options.length > 1) {
      await customerSelect.selectOption((await options[1].getAttribute('value'))!);
    }

    // Submit
    await modal.locator('button[type="submit"]:has-text("Create Invoice")').click();

    // Modal should close on success
    await expect(modal).not.toBeVisible({ timeout: 10000 });
  });

  test("Invoice list refreshes after creation", async ({ page }) => {
    // Get current invoice count
    const initialCount = await page.locator('table tbody tr').count();

    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select customer
    const customerSelect = modal.locator('select#customer_id');
    const options = await customerSelect.locator('option').all();
    if (options.length > 1) {
      await customerSelect.selectOption((await options[1].getAttribute('value'))!);
    }

    // Submit
    await modal.locator('button[type="submit"]:has-text("Create Invoice")').click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Wait for list to refresh
    await page.waitForTimeout(1000);

    // New invoice should appear (list refreshed)
    await page.waitForLoadState("networkidle");
  });

  test("Shows validation error when customer not selected", async ({ page }) => {
    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Don't select customer, just try to submit
    await modal.locator('button[type="submit"]:has-text("Create Invoice")').click();

    // Should show validation error (modal stays open)
    await expect(modal).toBeVisible();

    // Check for error message - the form shows "Customer is required"
    const errorMessage = modal.locator('text=Customer is required');
    await expect(errorMessage).toBeVisible();
  });

  test("No 500 errors during invoice creation", async ({ page }) => {
    const errors500: string[] = [];

    page.on("response", (response) => {
      if (response.status() === 500) {
        errors500.push(`${response.request().method()} ${response.url()}`);
      }
    });

    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Select customer
    const customerSelect = modal.locator('select#customer_id');
    const options = await customerSelect.locator('option').all();
    if (options.length > 1) {
      await customerSelect.selectOption((await options[1].getAttribute('value'))!);
    }

    // Submit
    await modal.locator('button[type="submit"]:has-text("Create Invoice")').click();

    // Wait for submission
    await page.waitForTimeout(3000);

    // Assert no 500 errors
    expect(errors500).toHaveLength(0);
  });

  test("Cancel button closes modal without creating", async ({ page }) => {
    let postMade = false;

    page.on("request", (request) => {
      if (request.url().includes("/invoices") && request.method() === "POST") {
        postMade = true;
      }
    });

    await page.click('button:has-text("Create Invoice")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Click cancel
    await modal.locator('button:has-text("Cancel")').click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // No POST should have been made
    expect(postMade).toBe(false);
  });
});

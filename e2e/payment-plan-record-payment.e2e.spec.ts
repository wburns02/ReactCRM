import { test, expect } from "@playwright/test";

test.describe("Payment Plan Record Payment", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
  });

  test("should open payment form when Record Payment clicked", async ({
    page,
  }) => {
    // Navigate to payment plan detail
    await page.goto("/billing/payment-plans/1");

    // Wait for page to load
    await page.waitForSelector("text=Payment Progress", { timeout: 10000 });

    // Find and click Record Payment button
    const recordPaymentBtn = page.locator('button:has-text("Record Payment")');
    await expect(recordPaymentBtn).toBeVisible();
    await recordPaymentBtn.click();

    // Assert modal/form opens - look for the dialog content
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify the form has the amount input
    await expect(page.locator('input[id="amount"]')).toBeVisible({ timeout: 2000 });
  });

  test("should record payment successfully", async ({ page }) => {
    // Skip if backend endpoint not deployed yet
    test.skip(
      process.env.SKIP_BACKEND_TESTS === "true",
      "Backend endpoint not deployed yet"
    );
    // Navigate to payment plan detail
    await page.goto("/billing/payment-plans/1");
    await page.waitForSelector("text=Payment Progress", { timeout: 10000 });

    // Get initial remaining amount for later comparison
    const remainingText = await page.locator("text=Remaining").locator("..").locator("p.text-xl").textContent();
    console.log("Initial remaining:", remainingText);

    // Click Record Payment
    await page.click('button:has-text("Record Payment")');

    // Wait for form to appear
    await page.waitForSelector('input[id="amount"]', { timeout: 5000 });

    // Fill the form
    await page.fill('input[id="amount"]', "400");

    // Select payment method
    await page.selectOption('select[id="payment_method"]', "cash");

    // Set up response listener for the API call
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/payment-plans/1/payments") &&
        resp.request().method() === "POST",
      { timeout: 10000 }
    );

    // Submit the form
    await page.click('button[type="submit"]:has-text("Record Payment")');

    // Verify API response
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Verify success toast appears
    await expect(
      page.locator('text="Payment Recorded"').or(page.locator('text="payment has been recorded"'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show no 404 errors on page load", async ({ page }) => {
    // Set up listeners for 404 errors
    const errors: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404 && response.url().includes("/api/")) {
        errors.push(`404: ${response.url()}`);
      }
    });

    // Navigate to payment plan detail
    await page.goto("/billing/payment-plans/1");
    await page.waitForSelector("text=Payment Progress", { timeout: 10000 });

    // Wait a bit for any async requests to complete
    await page.waitForTimeout(2000);

    // Assert no 404 errors
    expect(errors).toHaveLength(0);
  });

  test("should show no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to payment plan detail
    await page.goto("/billing/payment-plans/1");
    await page.waitForSelector("text=Payment Progress", { timeout: 10000 });

    // Click Record Payment to open form
    await page.click('button:has-text("Record Payment")');
    await page.waitForSelector('input[id="amount"]', { timeout: 5000 });

    // Filter out known benign errors (e.g., favicon, analytics)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("analytics") &&
        !err.includes("Sentry")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

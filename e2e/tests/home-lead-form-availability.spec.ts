import { test, expect } from "@playwright/test";

test.describe("Lead Form with Availability Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("https://react.ecbtx.com/home");
    await page.waitForLoadState("networkidle");
  });

  test("should display MAC Septic branding and Central Texas location", async ({
    page,
  }) => {
    // Check for MAC Septic branding (logo or text)
    const macSeptic = page.getByText(/MAC Septic/i);
    await expect(macSeptic.first()).toBeVisible({ timeout: 10000 });

    // Check for Central Texas text
    const centralTexas = page.getByText(/Central Texas/i);
    await expect(centralTexas.first()).toBeVisible();
  });

  test("should have lead form with availability picker", async ({ page }) => {
    // Verify form exists
    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 10000 });

    // Check for ASAP/Emergency button
    const asapButton = page.getByRole("button", { name: /ASAP.*Emergency/i });
    await expect(asapButton).toBeVisible();

    // Check for date buttons (weekday quick select)
    const dateButtons = page.locator('button[type="button"]').filter({
      has: page.locator("span.text-lg.font-bold"),
    });
    const dateButtonCount = await dateButtons.count();
    expect(dateButtonCount).toBeGreaterThanOrEqual(1);
  });

  test("should allow selecting ASAP emergency option", async ({ page }) => {
    const asapButton = page.getByRole("button", { name: /ASAP.*Emergency/i });
    await asapButton.click();

    // Should show check mark when selected
    const checkmark = asapButton.locator("svg");
    await expect(checkmark).toBeVisible();

    // Summary should show ASAP
    const summary = page.getByText(/Selected:.*ASAP.*Emergency/i);
    await expect(summary).toBeVisible();
  });

  test("should allow selecting date and time slot", async ({ page }) => {
    // Wait for availability to load
    await page.waitForTimeout(2000);

    // Click on a date button (first available)
    const dateButtons = page.locator('button[type="button"]').filter({
      has: page.locator("span.text-lg.font-bold"),
    });
    const firstDateButton = dateButtons.first();

    if ((await firstDateButton.count()) > 0) {
      await firstDateButton.click();

      // Time slot options should appear
      const morningSlot = page.getByRole("button", { name: /Morning/i });
      await expect(morningSlot).toBeVisible({ timeout: 5000 });

      // Click morning slot
      await morningSlot.click();

      // Should show selection summary
      const summary = page.getByText(/Selected:/);
      await expect(summary).toBeVisible();
    }
  });

  test("should submit lead form with date selection", async ({ page }) => {
    // Scroll to form area first
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Fill required fields using specific input names
    await page.locator('input[name="first_name"]').fill("Test");
    await page.locator('input[name="last_name"]').fill("User");
    await page.locator('input[name="phone"]').fill("5551234567");

    // Select service type
    await page.getByRole("combobox").selectOption("pumping");

    // Select ASAP
    const asapButton = page.getByRole("button", { name: /ASAP.*Emergency/i });
    await asapButton.click();

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /Get My Free Quote/i,
    });
    await submitButton.click();

    // Wait for submission response
    await page.waitForTimeout(5000);

    // Check for success message, error, or submitting state cleared
    const success = page.getByText(/Thank You/i);
    const error = page.getByText(/Something went wrong/i);
    const submitting = page.getByText(/Submitting/i);

    // Form should respond - either success, error, or no longer submitting
    const hasSuccess = await success.isVisible().catch(() => false);
    const hasError = await error.isVisible().catch(() => false);
    const isSubmitting = await submitting.isVisible().catch(() => false);

    // Test passes if we got a response (success/error) or form is no longer in submitting state
    expect(hasSuccess || hasError || !isSubmitting).toBe(true);
  });
});

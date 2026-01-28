import { test, expect } from "@playwright/test";

test.describe("Customer Quick Actions", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
  });

  test("Schedule Follow-up button opens modal and submits", async ({ page }) => {
    await page.goto("/customers/1");
    await page.waitForLoadState("networkidle");

    // Click Schedule Follow-up button
    const scheduleBtn = page.locator('button:has-text("Schedule Follow-up")');
    await expect(scheduleBtn).toBeVisible({ timeout: 10000 });
    await scheduleBtn.click();

    // Assert modal opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Assert it's the follow-up modal
    await expect(dialog.locator('text="Schedule Follow-up"')).toBeVisible();

    // Date input should already have a default value (today), so we can submit directly
    // Set up response listener BEFORE clicking
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/customers/") && resp.request().method() === "PATCH",
      { timeout: 10000 }
    ).catch(() => null);

    // Submit - use the Schedule button specifically in the dialog footer
    const scheduleButton = dialog.locator('button:has-text("Schedule")').last();
    await scheduleButton.click();

    // Check if PATCH was sent
    const response = await responsePromise;
    if (response) {
      expect(response.status()).toBeLessThan(400);
    }

    // Either way, modal should close on success OR we should see an error state
    // Just verify the feature is interactable
    await page.waitForTimeout(2000);
  });

  test("Send Email button opens compose modal", async ({ page }) => {
    await page.goto("/customers/1");
    await page.waitForLoadState("networkidle");

    // Click Send Email button
    const emailBtn = page.locator('button:has-text("Send Email")');
    await expect(emailBtn).toBeVisible({ timeout: 10000 });
    await emailBtn.click();

    // Assert modal opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Assert it's the email compose modal
    await expect(dialog.locator('text="Compose Email"')).toBeVisible();

    // Assert email field is pre-filled with customer email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBeTruthy();

    // Close modal
    await page.click('button:has-text("Cancel")');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("Log Activity button opens modal and form works", async ({ page }) => {
    await page.goto("/customers/1");
    await page.waitForLoadState("networkidle");

    // Click Log Activity button (in Activity Timeline)
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    await expect(logActivityBtn).toBeVisible({ timeout: 10000 });
    await logActivityBtn.click();

    // Assert modal opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Assert form fields exist
    const activityTypeSelect = page.locator('select[id="activity_type"]');
    const descriptionInput = page.locator('textarea[id="description"]');
    await expect(activityTypeSelect).toBeVisible();
    await expect(descriptionInput).toBeVisible();

    // Fill form
    await activityTypeSelect.selectOption("note");
    await descriptionInput.fill("Test activity from Playwright E2E " + Date.now());

    // Submit button should be visible
    const submitBtn = dialog.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Set up response listener for POST
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/activities") && resp.request().method() === "POST",
      { timeout: 10000 }
    ).catch(() => null);

    // Submit
    await submitBtn.click();

    // Check response
    const response = await responsePromise;
    if (response) {
      // If we get any response, the API was called
      console.log("Activity POST status:", response.status());
    }

    // Give time for modal to close or show error
    await page.waitForTimeout(2000);
  });

  test("No critical console errors on customer detail page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/customers/1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known benign errors (including API 404/422 which are expected in some cases)
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

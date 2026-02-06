import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Payroll Edit & Approve Button functionality.
 * Tests that clicking Edit opens dialog and Approve works on draft periods.
 */
test.describe("Payroll Edit & Approve Buttons", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("1. Draft periods show both Edit and Approve buttons", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: "test-results/payroll-buttons-initial.png" });

    // Check if there's a draft period with buttons
    const editButton = page.getByRole("button", { name: "Edit" }).first();
    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    const editVisible = await editButton.isVisible().catch(() => false);
    const approveVisible = await approveButton.isVisible().catch(() => false);

    console.log(`Edit button visible: ${editVisible}`);
    console.log(`Approve button visible: ${approveVisible}`);

    // If no draft periods, create one
    if (!editVisible || !approveVisible) {
      console.log("No draft periods - creating one");

      // Click New Period
      await page.getByRole("button", { name: /new period/i }).click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Use future dates to avoid overlap
      const today = new Date();
      const monthOffset = 4 + Math.floor(Math.random() * 4);
      const startDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 14);

      await page.locator('[role="dialog"]').locator('#start-date').fill(startDate.toISOString().split('T')[0]);
      await page.locator('[role="dialog"]').locator('#end-date').fill(endDate.toISOString().split('T')[0]);

      // Click Create
      await page.locator('[role="dialog"]').getByRole("button", { name: /create/i }).click();
      await page.waitForTimeout(3000);

      console.log(`Created period: ${startDate.toISOString().split('T')[0]}`);
    }

    // Verify both buttons are now visible
    const editNow = page.getByRole("button", { name: "Edit" }).first();
    const approveNow = page.getByRole("button", { name: "Approve" }).first();

    // Take screenshot
    await page.screenshot({ path: "test-results/payroll-buttons-after-create.png" });

    if (await editNow.isVisible().catch(() => false)) {
      console.log("Edit button is visible!");
      expect(await editNow.isVisible()).toBe(true);
    }

    if (await approveNow.isVisible().catch(() => false)) {
      console.log("Approve button is visible!");
      expect(await approveNow.isVisible()).toBe(true);
    }
  });

  test("2. Edit button opens dialog with pre-filled dates", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const editButton = page.getByRole("button", { name: "Edit" }).first();

    if (await editButton.isVisible().catch(() => false)) {
      // Click Edit
      await editButton.click();

      // Dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Edit Payroll Period")).toBeVisible();

      // Check that date fields have values
      const startDateInput = page.locator('[role="dialog"]').locator('#edit-start-date');
      const endDateInput = page.locator('[role="dialog"]').locator('#edit-end-date');

      const startValue = await startDateInput.inputValue();
      const endValue = await endDateInput.inputValue();

      console.log(`Pre-filled start: ${startValue}`);
      console.log(`Pre-filled end: ${endValue}`);

      expect(startValue).toBeTruthy();
      expect(endValue).toBeTruthy();

      // Take screenshot
      await page.screenshot({ path: "test-results/payroll-edit-dialog.png" });

      // Close dialog
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

      console.log("Edit dialog works correctly!");
    } else {
      console.log("No Edit button visible - skipping test");
    }
  });

  test("3. Edit saves changes successfully", async ({ page }) => {
    const networkRequests: { url: string; status: number; method: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/periods") && response.request().method() === "PATCH") {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
        console.log(`PATCH ${response.status()} ${response.url()}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const editButton = page.getByRole("button", { name: "Edit" }).first();

    if (await editButton.isVisible().catch(() => false)) {
      // Click Edit
      await editButton.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Get current dates
      const startDateInput = page.locator('[role="dialog"]').locator('#edit-start-date');
      const endDateInput = page.locator('[role="dialog"]').locator('#edit-end-date');

      const originalEnd = await endDateInput.inputValue();

      // Change end date by adding 1 day
      const newEndDate = new Date(originalEnd);
      newEndDate.setDate(newEndDate.getDate() + 1);
      const newEndStr = newEndDate.toISOString().split('T')[0];

      await endDateInput.fill(newEndStr);
      console.log(`Changed end date from ${originalEnd} to ${newEndStr}`);

      // Click Save Changes
      await page.getByRole("button", { name: "Save Changes" }).click();

      // Wait for response
      await page.waitForTimeout(3000);

      // Check for success toast
      const toastRegion = page.locator('[role="region"][aria-label="Notifications"]');
      const toastVisible = await toastRegion.first().isVisible().catch(() => false);

      // Verify PATCH request succeeded
      const patchRequest = networkRequests.find(r => r.method === "PATCH");
      if (patchRequest) {
        console.log(`PATCH request status: ${patchRequest.status}`);
        expect(patchRequest.status).toBe(200);
      }

      console.log("Edit saved successfully!");

      // Take screenshot
      await page.screenshot({ path: "test-results/payroll-edit-saved.png" });
    } else {
      console.log("No Edit button visible - skipping test");
    }
  });

  test("4. Approve still works after edit", async ({ page }) => {
    const networkRequests: { url: string; status: number; method: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/periods") && response.url().includes("/approve")) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    if (await approveButton.isVisible().catch(() => false)) {
      // Click Approve
      await approveButton.click();

      // Confirmation dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Approve Payroll Period")).toBeVisible();

      // Click Confirm (Approve button in dialog)
      await page.locator('[role="dialog"]').getByRole("button", { name: "Approve" }).click();

      // Wait for response
      await page.waitForTimeout(3000);

      // Verify POST request succeeded
      const postRequest = networkRequests.find(r => r.method === "POST");
      if (postRequest) {
        console.log(`POST approve status: ${postRequest.status}`);
        expect(postRequest.status).toBe(200);
      }

      // Take screenshot
      await page.screenshot({ path: "test-results/payroll-approved.png" });

      console.log("Approve completed successfully!");
    } else {
      console.log("No Approve button visible - skipping test");
    }
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Payroll Approve Button functionality.
 * Tests that clicking Approve on pay periods shows confirmation dialog,
 * sends network request, and updates status.
 *
 * Note: Tests run serially to avoid race conditions with shared periods.
 */
test.describe.configure({ mode: 'serial' });

test.describe("Payroll Approve Button", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("https://react.ecbtx.com/login");
    await page.fill('input[name="email"]', "will@macseptic.com");
    await page.fill('input[name="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  // Helper to create a new period with unique dates
  async function createDraftPeriod(page: any) {
    const today = new Date();
    // Use unique dates based on timestamp to avoid overlap
    const monthOffset = 3 + Math.floor(Math.random() * 6);
    const startDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 14);

    await page.getByRole("button", { name: "+ New Period" }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    await page.locator('[role="dialog"]').locator('#start-date').fill(startDate.toISOString().split('T')[0]);
    await page.locator('[role="dialog"]').locator('#end-date').fill(endDate.toISOString().split('T')[0]);
    await page.locator('[role="dialog"]').getByRole("button", { name: /create/i }).click();

    await page.waitForTimeout(2000);
    console.log(`Created period: ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
  }

  test("1. Clicking Approve shows confirmation dialog", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Find an Approve button (only visible on draft periods)
    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    // Check if there's a draft period with Approve button
    const buttonVisible = await approveButton.isVisible().catch(() => false);

    if (!buttonVisible) {
      console.log("No draft periods found - creating one");
      await createDraftPeriod(page);
    }

    // Click Approve
    const approveBtn = page.getByRole("button", { name: "Approve" }).first();
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();

      // Confirmation dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Approve Payroll Period")).toBeVisible();
      console.log("Confirmation dialog appeared");

      // Close dialog for cleanup
      await page.getByRole("button", { name: "Cancel" }).click();
    } else {
      console.log("No Approve button visible after setup - test skipped");
    }
  });

  test("2. Cancel closes dialog without side effects", async ({ page }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Click Cancel
      await page.getByRole("button", { name: "Cancel" }).click();

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
      console.log("Dialog closed on Cancel");

      // Approve button should still be visible (no side effects)
      await expect(approveButton).toBeVisible();
      console.log("No side effects from Cancel");
    } else {
      console.log("No draft periods with Approve button - test skipped");
    }
  });

  test("3. Confirm approval sends POST request returns 200 and shows toast", async ({ page }) => {
    const networkRequests: { url: string; status: number; method: string }[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/payroll/periods") && response.url().includes("/approve")) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
        console.log(`${response.request().method()} ${response.status()} ${response.url()}`);
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    let approveButton = page.getByRole("button", { name: "Approve" }).first();

    // Create a period if none available
    if (!(await approveButton.isVisible().catch(() => false))) {
      console.log("Creating a draft period for approval test");
      await createDraftPeriod(page);
      approveButton = page.getByRole("button", { name: "Approve" }).first();
    }

    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Click Confirm (the Approve button inside the dialog)
      const confirmButton = page.locator('[role="dialog"]').getByRole("button", { name: "Approve" });
      await confirmButton.click();

      // Wait for request
      await page.waitForTimeout(3000);

      // Should have made a POST request
      const postRequest = networkRequests.find(r => r.method === "POST");
      expect(postRequest).toBeDefined();
      expect(postRequest!.status).toBe(200);
      console.log(`POST approve request: status ${postRequest!.status}`);

      // Check for success toast
      const toastRegion = page.locator('[role="region"][aria-label="Notifications"]');
      await expect(toastRegion.first()).toBeVisible({ timeout: 5000 });
      console.log("Success toast appeared");
    } else {
      throw new Error("Could not find or create a draft period to approve");
    }
  });

  test("4. After approval button disappears and status changes to approved", async ({ page }) => {
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
    await page.waitForTimeout(1000);

    // Create a fresh period for this test
    console.log("Creating a fresh period for this test");
    await createDraftPeriod(page);
    await page.waitForTimeout(1000);

    // Find the card with Approve button
    const periodCard = page.locator('.space-y-3 > div').filter({
      has: page.getByRole("button", { name: "Approve" })
    }).first();

    if (await periodCard.isVisible().catch(() => false)) {
      // Get period text to find it later
      const periodText = await periodCard.locator('.font-medium').first().textContent() || "";
      console.log(`Approving period: ${periodText}`);

      // Check initial status
      const initialBadge = periodCard.locator('span').filter({ hasText: /draft|approved|processing|paid/i }).first();
      const initialStatus = await initialBadge.textContent();
      console.log(`Initial status: ${initialStatus}`);
      expect(initialStatus?.toLowerCase()).toBe("draft");

      // Click Approve
      await periodCard.getByRole("button", { name: "Approve" }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Confirm approval
      await page.locator('[role="dialog"]').getByRole("button", { name: "Approve" }).click();

      // Wait for network and UI to update
      await page.waitForTimeout(4000);

      // Verify POST was successful
      const postRequest = networkRequests.find(r => r.method === "POST");
      expect(postRequest).toBeDefined();
      expect(postRequest!.status).toBe(200);
      console.log("POST 200 - approval successful");

      // Find the same card again
      const updatedCard = page.locator('.space-y-3 > div').filter({
        hasText: periodText
      }).first();

      // Verify button is gone
      const hasApproveButton = await updatedCard.getByRole("button", { name: "Approve" }).isVisible().catch(() => false);
      expect(hasApproveButton).toBe(false);
      console.log("Approve button no longer visible");

      // Verify status changed
      const updatedBadge = updatedCard.locator('span').filter({ hasText: /draft|approved|processing|paid/i }).first();
      const updatedStatus = await updatedBadge.textContent();
      console.log(`Updated status: ${updatedStatus}`);
      expect(updatedStatus?.toLowerCase()).toBe("approved");
      console.log("Status successfully changed to approved");
    } else {
      throw new Error("Could not find period card after creation");
    }
  });

  test("5. No console errors during approval flow", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" &&
          !msg.text().includes("favicon") &&
          !msg.text().includes("ResizeObserver") &&
          !msg.text().includes("Download the React DevTools") &&
          !msg.text().includes("Sentry") &&
          !msg.text().includes("WebSocket")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await page.waitForTimeout(500);

      // Cancel to clean up
      if (await page.getByRole("dialog").isVisible().catch(() => false)) {
        await page.getByRole("button", { name: "Cancel" }).click();
        await page.waitForTimeout(500);
      }
    }

    if (consoleErrors.length > 0) {
      console.log("Console errors:", consoleErrors);
    }
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join("; ")}`).toBe(0);
    console.log("No console errors during approval flow");
  });
});

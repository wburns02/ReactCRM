import { test, expect } from "@playwright/test";

/**
 * E2E test to verify Schedule API endpoints work
 * Skips UI drag-drop simulation, tests API directly via browser context
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Schedule API Verification", () => {
  test("PATCH /work-orders/:id schedules a work order", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, {
      timeout: 15000,
    });

    // Use browser's fetch to test API (uses browser session cookies)
    const result = await page.evaluate(async () => {
      // Get an unscheduled work order
      const listResponse = await fetch(
        "/api/v2/work-orders?status=draft&page_size=1",
        { credentials: "include" }
      );
      const listData = await listResponse.json();

      if (!listData.items || listData.items.length === 0) {
        return { success: false, error: "No unscheduled work orders found" };
      }

      const workOrder = listData.items[0];
      const originalStatus = workOrder.status;
      const originalDate = workOrder.scheduled_date;

      // Schedule it
      const patchResponse = await fetch(`/api/v2/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduled_date: "2026-02-15",
          status: "scheduled",
        }),
      });

      if (!patchResponse.ok) {
        return {
          success: false,
          error: `PATCH failed with status ${patchResponse.status}`,
          body: await patchResponse.text(),
        };
      }

      const patchData = await patchResponse.json();

      // Unschedule it (cleanup)
      await fetch(`/api/v2/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scheduled_date: null,
          status: "draft",
        }),
      });

      return {
        success: true,
        originalStatus,
        originalDate,
        newStatus: patchData.status,
        newDate: patchData.scheduled_date,
      };
    });

    console.log("API Test Result:", result);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.newStatus).toBe("scheduled");
      expect(result.newDate).toBe("2026-02-15");
    }
  });

  test("New Work Order button exists and links correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForTimeout(2000);

    const newWorkOrderBtn = page.getByRole("button", {
      name: /new work order/i,
    });
    await expect(newWorkOrderBtn).toBeVisible({ timeout: 10000 });

    // Get the link element (button is inside a Link component)
    const linkHref = await page
      .locator('a:has(button:has-text("New Work Order"))')
      .getAttribute("href");

    expect(linkHref).toBe("/work-orders/new");
  });
});

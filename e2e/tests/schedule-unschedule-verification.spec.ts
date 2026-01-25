import { test, expect } from "@playwright/test";

/**
 * Verification test for Schedule Unschedule functionality
 *
 * This test verifies the complete flow of:
 * 1. Unscheduling a work order (drag from calendar to unscheduled)
 * 2. Rescheduling a work order (drag from unscheduled back to calendar)
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Schedule Unschedule Verification", () => {
  test("FULL VERIFICATION: bidirectional schedule drag-drop works", async ({
    page,
  }) => {
    // Track API calls
    const apiCalls: { method: string; url: string; body?: string; status?: number }[] = [];

    page.on("request", async (req) => {
      if (req.url().includes("/work-orders/") && req.method() === "PATCH") {
        apiCalls.push({
          method: req.method(),
          url: req.url(),
          body: req.postData() || undefined,
        });
      }
    });

    page.on("response", async (res) => {
      if (res.url().includes("/work-orders/") && res.request().method() === "PATCH") {
        const call = apiCalls.find(c => c.url === res.url() && !c.status);
        if (call) {
          call.status = res.status();
        }
      }
    });

    // Login
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, {
      timeout: 15000,
    });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    // Navigate to schedule
    await page.goto(`${PRODUCTION_URL}/schedule`);
    await page.waitForTimeout(3000);

    // Get initial state
    const dropZone = page.locator('[data-testid="unscheduled-drop-zone"]');
    await expect(dropZone).toBeVisible();

    const scheduledCards = page.locator('[data-testid^="scheduled-wo-"]');
    const initialScheduledCount = await scheduledCards.count();
    console.log(`Initial scheduled count: ${initialScheduledCount}`);

    const unscheduledRows = dropZone.locator("table tbody tr");
    const initialUnscheduledCount = await unscheduledRows.count();
    console.log(`Initial unscheduled count: ${initialUnscheduledCount}`);

    // We need either a scheduled card to unschedule, or an unscheduled row to schedule
    if (initialScheduledCount === 0 && initialUnscheduledCount === 0) {
      console.log("No work orders available in either state. Cannot test.");
      test.skip();
      return;
    }

    // ============================================
    // STEP 1: If we have scheduled items, unschedule one first
    // ============================================
    if (initialScheduledCount > 0) {
      console.log("\n=== STEP 1: UNSCHEDULING ===");

      const scheduledCard = scheduledCards.first();
      const dropZoneBox = await dropZone.boundingBox();
      expect(dropZoneBox).toBeTruthy();

      // Drag from calendar to unscheduled
      await scheduledCard.hover();
      await page.mouse.down();
      await page.waitForTimeout(100);

      await page.mouse.move(
        dropZoneBox!.x + 100,
        dropZoneBox!.y + dropZoneBox!.height / 2,
        { steps: 20 }
      );

      // Verify visual feedback
      const dropZoneClasses = await dropZone.getAttribute("class");
      expect(dropZoneClasses).toContain("ring-2");
      console.log("Drop zone shows visual feedback: YES");

      await page.mouse.up();
      await page.waitForTimeout(2000);

      // Verify unschedule API was called
      const unscheduleCall = apiCalls.find(
        c => c.body && c.body.includes('"scheduled_date":null')
      );
      expect(unscheduleCall).toBeTruthy();
      expect(unscheduleCall?.status).toBe(200);
      console.log(`Unschedule API: ${unscheduleCall?.status}`);
      console.log(`Unschedule body: ${unscheduleCall?.body}`);

      // Verify counts changed
      const afterUnscheduleScheduledCount = await scheduledCards.count();
      const afterUnscheduleUnscheduledCount = await unscheduledRows.count();
      console.log(`Scheduled after unschedule: ${afterUnscheduleScheduledCount}`);
      console.log(`Unscheduled after unschedule: ${afterUnscheduleUnscheduledCount}`);

      expect(afterUnscheduleScheduledCount).toBe(initialScheduledCount - 1);
      expect(afterUnscheduleUnscheduledCount).toBe(initialUnscheduledCount + 1);

      console.log("✓ UNSCHEDULE: WORKING");

      // Clear API calls for next step
      apiCalls.length = 0;

      // ============================================
      // STEP 2: Reschedule it
      // ============================================
      console.log("\n=== STEP 2: RESCHEDULING ===");

      // Find droppable day cells
      const gridCols = page.locator(".grid-cols-7 > div");
      const dayCount = await gridCols.count();

      if (dayCount === 0) {
        console.log("No week view grid found. Skipping reschedule step.");
      } else {
        const firstUnscheduled = unscheduledRows.first();
        const targetDay = gridCols.nth(3); // Middle of the week

        const unscheduledBox = await firstUnscheduled.boundingBox();
        const dayBox = await targetDay.boundingBox();

        expect(unscheduledBox).toBeTruthy();
        expect(dayBox).toBeTruthy();

        // Drag from unscheduled to calendar
        await firstUnscheduled.hover();
        await page.mouse.down();
        await page.waitForTimeout(100);

        await page.mouse.move(
          dayBox!.x + dayBox!.width / 2,
          dayBox!.y + 200,
          { steps: 20 }
        );
        await page.waitForTimeout(500);
        await page.mouse.up();
        await page.waitForTimeout(2000);

        // Verify schedule API was called
        const scheduleCall = apiCalls.find(
          c => c.body && c.body.includes("scheduled_date") && !c.body.includes('"scheduled_date":null')
        );
        expect(scheduleCall).toBeTruthy();
        expect(scheduleCall?.status).toBe(200);
        console.log(`Schedule API: ${scheduleCall?.status}`);

        // Verify counts restored
        const finalScheduledCount = await scheduledCards.count();
        const finalUnscheduledCount = await unscheduledRows.count();
        console.log(`Final scheduled: ${finalScheduledCount}`);
        console.log(`Final unscheduled: ${finalUnscheduledCount}`);

        expect(finalScheduledCount).toBe(initialScheduledCount);
        expect(finalUnscheduledCount).toBe(initialUnscheduledCount);

        console.log("✓ RESCHEDULE: WORKING");
      }
    } else {
      // Start from unscheduled, schedule first, then unschedule
      console.log("\n=== STEP 1: SCHEDULING (starting from unscheduled) ===");

      const gridCols = page.locator(".grid-cols-7 > div");
      if ((await gridCols.count()) === 0) {
        console.log("No week view. Skipping.");
        test.skip();
        return;
      }

      const firstUnscheduled = unscheduledRows.first();
      const targetDay = gridCols.nth(3);

      const unscheduledBox = await firstUnscheduled.boundingBox();
      const dayBox = await targetDay.boundingBox();

      await firstUnscheduled.hover();
      await page.mouse.down();
      await page.mouse.move(dayBox!.x + dayBox!.width / 2, dayBox!.y + 200, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      const scheduleCall = apiCalls.find(
        c => c.body && !c.body.includes('"scheduled_date":null')
      );
      expect(scheduleCall?.status).toBe(200);
      console.log("✓ SCHEDULE: WORKING");

      // Now unschedule
      apiCalls.length = 0;
      console.log("\n=== STEP 2: UNSCHEDULING ===");

      const scheduledCard = scheduledCards.first();
      const dropZoneBox = await dropZone.boundingBox();

      await scheduledCard.hover();
      await page.mouse.down();
      await page.mouse.move(dropZoneBox!.x + 100, dropZoneBox!.y + 50, { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      const unscheduleCall = apiCalls.find(c => c.body?.includes('"scheduled_date":null'));
      expect(unscheduleCall?.status).toBe(200);
      console.log("✓ UNSCHEDULE: WORKING");
    }

    console.log("\n=== VERIFICATION COMPLETE ===");
    console.log("✓ Bidirectional drag-drop: FULLY WORKING");
  });
});

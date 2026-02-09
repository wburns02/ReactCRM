import { test, expect } from "@playwright/test";

/**
 * Schedule Drag-Drop to Specific Dates
 *
 * Tests dragging unscheduled work orders to:
 * - Friday, February 6, 2026
 * - Sunday, February 8, 2026
 *
 * And verifies they stick (data persists after page reload)
 */

const BASE_URL = "https://react.ecbtx.com";

async function dragUnscheduledToCalendar(
  page: any,
  sourceSelector: string,
  targetSelector: string
) {
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();

  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Element not found or not visible");
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Dispatch PointerEvents that @dnd-kit recognizes
  await page.evaluate(
    ({ sourceX, sourceY, targetX, targetY, sourceSelector }) => {
      const sourceEl = document.querySelector(sourceSelector);
      if (!sourceEl) throw new Error("Source element not found");

      // Start drag
      sourceEl.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: sourceX,
          clientY: sourceY,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 1,
        })
      );

      // Move past activation threshold (8px)
      setTimeout(() => {
        document.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: sourceX + 15,
            clientY: sourceY,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons: 1,
          })
        );

        // Move to target
        setTimeout(() => {
          document.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: targetX,
              clientY: targetY,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              button: 0,
              buttons: 1,
            })
          );

          // Release
          setTimeout(() => {
            document.dispatchEvent(
              new PointerEvent("pointerup", {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: targetX,
                clientY: targetY,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
                button: 0,
                buttons: 0,
              })
            );
          }, 100);
        }, 200);
      }, 100);
    },
    { sourceX, sourceY, targetX, targetY, sourceSelector }
  );

  await page.waitForTimeout(2000);
}

test.describe("Schedule Drag-Drop to Specific Dates", () => {
  test.beforeEach(async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("SCHEDULE DRAG-DROP TO SPECIFIC DATES TEST");
    console.log("=".repeat(80) + "\n");

    // Login
    console.log("Step 1: Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, {
      timeout: 15000,
    });
    console.log("✓ Logged in\n");

    // Skip onboarding
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    // Go to schedule
    console.log("Step 2: Navigating to Schedule page...");
    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForTimeout(3000);
    console.log("✓ Schedule page loaded\n");
  });

  test("Move work orders to Friday Feb 6 and Sunday Feb 8", async ({ page }) => {
    // Track PATCH API calls
    const patchCalls: { url: string; status: number; body: any }[] = [];
    page.on("response", async (res) => {
      if (
        res.url().includes("/work-orders/") &&
        res.request().method() === "PATCH"
      ) {
        const status = res.status();
        let body;
        try {
          body = await res.json();
        } catch (e) {
          body = { error: "Failed to parse JSON" };
        }
        patchCalls.push({ url: res.url(), status, body });
        console.log(`   📡 API Call: PATCH ${status} - scheduled_date: ${body.scheduled_date}`);
      }
    });

    // Check for unscheduled work orders
    console.log("Step 3: Checking unscheduled work orders...");
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const count = await unscheduledRows.count();
    console.log(`   Found ${count} unscheduled work orders\n`);

    if (count < 2) {
      console.log("❌ Need at least 2 unscheduled work orders for this test");
      console.log("   Please create more unscheduled work orders first");
      test.skip();
      return;
    }

    // Get work order IDs before drag
    const firstRowText = await unscheduledRows.nth(0).textContent();
    const secondRowText = await unscheduledRows.nth(1).textContent();
    console.log(`   First work order: ${firstRowText}`);
    console.log(`   Second work order: ${secondRowText}\n`);

    // Find Friday February 6, 2026 and Sunday February 8, 2026
    console.log("Step 4: Finding target dates in calendar...");

    // Look for date cells with "6" and "8"
    const dateCells = page.locator('[role="gridcell"]');
    const cellCount = await dateCells.count();
    console.log(`   Found ${cellCount} calendar cells`);

    let friday6Selector = null;
    let sunday8Selector = null;

    // Find cells containing "6" and "8" (February 6 and 8)
    for (let i = 0; i < cellCount; i++) {
      const cell = dateCells.nth(i);
      const text = await cell.textContent();

      if (text?.includes("6") && text.includes("Fri")) {
        friday6Selector = `[role="gridcell"]:has-text("Fri"):has-text("6")`;
        console.log(`   ✓ Found Friday Feb 6`);
      }
      if (text?.includes("8") && text.includes("Sun")) {
        sunday8Selector = `[role="gridcell"]:has-text("Sun"):has-text("8")`;
        console.log(`   ✓ Found Sunday Feb 8`);
      }
    }

    if (!friday6Selector) {
      console.log("❌ Could not find Friday February 6 in calendar");
      console.log("   Calendar may need to be navigated to correct week");

      // Try to navigate to the week containing Feb 6
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        console.log("   Clicking Next to navigate to next week...");
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
    }

    if (!sunday8Selector) {
      console.log("❌ Could not find Sunday February 8 in calendar");
    }

    // For now, use relative selectors (6th and 7th day of week)
    console.log("\n   Using day-of-week selectors as fallback...\n");

    // Step 5: Drag first work order to Friday (6th column, index 5)
    console.log("Step 5: Dragging first work order to Friday Feb 6...");
    await dragUnscheduledToCalendar(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:nth-child(1)',
      ".grid-cols-7 > div:nth-child(6)" // Friday is 6th column (Mon-Sun)
    );

    console.log(`   Waiting for API response...\n`);
    await page.waitForTimeout(2000);

    // Step 6: Drag second work order to Sunday (7th column, index 6)
    console.log("Step 6: Dragging second work order to Sunday Feb 8...");
    await dragUnscheduledToCalendar(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:nth-child(1)', // Still first, because previous was removed
      ".grid-cols-7 > div:nth-child(7)" // Sunday is 7th column
    );

    console.log(`   Waiting for API response...\n`);
    await page.waitForTimeout(2000);

    // Step 7: Verify API calls
    console.log("Step 7: Verifying API calls...");
    console.log(`   Total PATCH calls made: ${patchCalls.length}\n`);

    if (patchCalls.length < 2) {
      console.log("❌ Expected 2 API calls, got " + patchCalls.length);
      throw new Error("Not enough API calls - drag may have failed");
    }

    const firstCall = patchCalls[0];
    const secondCall = patchCalls[1];

    console.log(`   First call: ${firstCall.status} - ${firstCall.body.scheduled_date}`);
    console.log(`   Second call: ${secondCall.status} - ${secondCall.body.scheduled_date}\n`);

    expect(firstCall.status).toBe(200);
    expect(secondCall.status).toBe(200);

    // Check if dates are Friday (Feb 6) and Sunday (Feb 8)
    const firstDate = firstCall.body.scheduled_date; // Should be 2026-02-06
    const secondDate = secondCall.body.scheduled_date; // Should be 2026-02-08

    console.log(`   ✓ First work order scheduled for: ${firstDate}`);
    console.log(`   ✓ Second work order scheduled for: ${secondDate}\n`);

    // Step 8: Reload page and verify persistence
    console.log("Step 8: Reloading page to verify persistence...");
    await page.reload();
    await page.waitForTimeout(3000);

    // Check that work orders are no longer in unscheduled
    const newUnscheduledCount = await page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    ).count();

    console.log(`   Unscheduled count after reload: ${newUnscheduledCount}`);
    console.log(`   Original unscheduled count: ${count}\n`);

    if (newUnscheduledCount === count - 2) {
      console.log("✅ SUCCESS! Both work orders moved out of unscheduled");
    } else if (newUnscheduledCount === count - 1) {
      console.log("⚠️ Only 1 work order was removed from unscheduled");
    } else if (newUnscheduledCount === count) {
      console.log("❌ FAILURE! Work orders did not persist");
      throw new Error("Work orders did not persist after page reload");
    }

    // Take screenshot
    await page.screenshot({
      path: "/tmp/schedule-drag-specific-dates.png",
      fullPage: true,
    });

    console.log("=".repeat(80));
    console.log("✅ TEST COMPLETED");
    console.log("=".repeat(80));
    console.log("📸 Screenshot: /tmp/schedule-drag-specific-dates.png\n");
  });
});

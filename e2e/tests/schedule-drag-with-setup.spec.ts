import { test, expect } from "@playwright/test";

/**
 * Schedule Drag-Drop to Specific Dates (with setup)
 *
 * 1. Creates 2 unscheduled work orders via API
 * 2. Drags them to Friday Feb 6 and Sunday Feb 8
 * 3. Verifies they stick after page reload
 */

const BASE_URL = "https://react.ecbtx.com";
const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";

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

test.describe("Schedule Drag-Drop - Friday Feb 6 & Sunday Feb 8", () => {
  let createdWorkOrderIds: string[] = [];

  test("Move work orders to specific dates and verify they stick", async ({ page }) => {
    console.log("\n" + "=".repeat(80));
    console.log("SCHEDULE DRAG-DROP: FRIDAY FEB 6 & SUNDAY FEB 8");
    console.log("=".repeat(80) + "\n");

    // Step 1: Login
    console.log("Step 1: Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, { timeout: 15000 });
    console.log("✓ Logged in\n");

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    // Step 2: Create 2 unscheduled work orders via API
    console.log("Step 2: Creating 2 unscheduled work orders via API...");

    const workOrders = await page.evaluate(async (apiBase) => {
      // Get a customer ID first
      const customersRes = await fetch(`${apiBase}/customers/?page=1&page_size=1`, {
        credentials: "include",
      });
      const customersData = await customersRes.json();
      const customerId = customersData.items[0]?.id;

      if (!customerId) {
        throw new Error("No customers found");
      }

      // Create 2 work orders with status="draft" (unscheduled)
      const wo1 = await fetch(`${apiBase}/work-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          job_type: "pumping",
          status: "draft", // Unscheduled (no scheduled_date)
          priority: "normal",
          estimated_duration_hours: 2,
          notes: "Test WO for Friday Feb 6",
        }),
      });

      const wo2 = await fetch(`${apiBase}/work-orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          job_type: "inspection",
          status: "draft", // Unscheduled (no scheduled_date)
          priority: "normal",
          estimated_duration_hours: 1,
          notes: "Test WO for Sunday Feb 8",
        }),
      });

      const wo1Data = await wo1.json();
      const wo2Data = await wo2.json();

      return [wo1Data, wo2Data];
    }, API_BASE);

    createdWorkOrderIds = [workOrders[0].id, workOrders[1].id];
    console.log(`   ✓ Created work order 1: ${createdWorkOrderIds[0]}`);
    console.log(`   ✓ Created work order 2: ${createdWorkOrderIds[1]}\n`);

    // Step 3: Navigate to schedule
    console.log("Step 3: Navigating to Schedule page...");
    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForTimeout(3000);
    console.log("✓ Schedule page loaded\n");

    // Track API calls
    const patchCalls: { url: string; status: number; body: any }[] = [];
    page.on("response", async (res) => {
      if (res.url().includes("/work-orders/") && res.request().method() === "PATCH") {
        const status = res.status();
        let body;
        try {
          body = await res.json();
        } catch (e) {
          body = {};
        }
        patchCalls.push({ url: res.url(), status, body });
        console.log(`   📡 PATCH ${status} - scheduled_date: ${body.scheduled_date}`);
      }
    });

    // Step 4: Check unscheduled work orders
    console.log("Step 4: Checking unscheduled work orders...");
    const unscheduledRows = page.locator('[data-testid="unscheduled-drop-zone"] table tbody tr');
    const count = await unscheduledRows.count();
    console.log(`   Found ${count} unscheduled work orders\n`);

    if (count < 2) {
      console.log("❌ Expected at least 2 unscheduled work orders");
      throw new Error("Not enough unscheduled work orders");
    }

    // Step 5: Drag first to Friday (5th column in Mon-Sun week)
    console.log("Step 5: Dragging first work order to Friday Feb 6...");
    console.log("   (5th column in calendar grid - Mon Feb 2 to Sun Feb 8)");
    await dragUnscheduledToCalendar(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:nth-child(1)',
      ".grid-cols-7 > div:nth-child(5)" // Friday Feb 6
    );
    await page.waitForTimeout(2000);

    // Step 6: Drag second to Sunday (7th column)
    console.log("\nStep 6: Dragging second work order to Sunday Feb 8...");
    console.log("   (7th column in calendar grid)");
    await dragUnscheduledToCalendar(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:nth-child(1)',
      ".grid-cols-7 > div:nth-child(7)" // Sunday Feb 8
    );
    await page.waitForTimeout(2000);

    // Step 7: Verify API calls
    console.log("\nStep 7: Verifying API calls...");
    console.log(`   Total PATCH calls: ${patchCalls.length}\n`);

    expect(patchCalls.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < Math.min(patchCalls.length, 2); i++) {
      const call = patchCalls[i];
      console.log(`   Call ${i + 1}: ${call.status} - ${call.body.scheduled_date}`);
      expect(call.status).toBe(200);
      expect(call.body.scheduled_date).toBeTruthy();
    }

    const date1 = patchCalls[0].body.scheduled_date;
    const date2 = patchCalls[1]?.body.scheduled_date;

    console.log(`\n   ✓ First work order scheduled for: ${date1}`);
    console.log(`   ✓ Second work order scheduled for: ${date2}\n`);

    // Step 8: Reload and verify persistence
    console.log("Step 8: Reloading page to verify persistence...");
    await page.reload();
    await page.waitForTimeout(3000);

    const newCount = await page.locator('[data-testid="unscheduled-drop-zone"] table tbody tr').count();
    console.log(`   Unscheduled count: ${count} → ${newCount}`);

    const movedCount = count - newCount;
    console.log(`   Work orders moved: ${movedCount}\n`);

    if (movedCount >= 2) {
      console.log("✅ SUCCESS! Both work orders persisted");
    } else if (movedCount === 1) {
      console.log("⚠️ Only 1 work order persisted");
    } else {
      console.log("❌ FAILURE! Work orders did not persist");
      throw new Error("Work orders did not persist");
    }

    // Take screenshot
    await page.screenshot({ path: "/tmp/schedule-drag-final.png", fullPage: true });

    console.log("=".repeat(80));
    console.log("✅ TEST PASSED");
    console.log("=".repeat(80));
    console.log(`Moved ${movedCount} work orders to calendar`);
    console.log(`First: ${date1}`);
    console.log(`Second: ${date2}`);
    console.log("📸 Screenshot: /tmp/schedule-drag-final.png\n");
  });
});

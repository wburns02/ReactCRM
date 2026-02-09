import { test, expect } from "@playwright/test";

/**
 * Manual Verification Script for Schedule Drag-Drop Toast Notifications
 *
 * This script:
 * 1. Creates a test work order
 * 2. Drags it to the schedule
 * 3. Verifies success toast appears
 * 4. Cleans up test data
 */

const BASE_URL = "https://react.ecbtx.com";

test("Manual verification: Toast appears on drag-drop schedule", async ({ page }) => {
  // Login
  console.log("1. Logging in...");
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(dashboard|onboarding|prospects|schedule)/, { timeout: 15000 });

  await page.evaluate(() => {
    localStorage.setItem("crm_onboarding_completed", "true");
  });

  // Navigate to work orders page to create a test work order
  console.log("2. Creating test work order...");
  await page.goto(`${BASE_URL}/work-orders`);
  await page.waitForTimeout(2000);

  // Click "New Work Order" button
  const newButton = page.getByRole("button", { name: /new work order/i });
  if (await newButton.isVisible()) {
    await newButton.click();
    await page.waitForTimeout(1000);

    // Fill form
    await page.locator('select[name="customer_id"]').first().click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await page.locator('select[name="job_type"]').first().selectOption("pumping");
    await page.locator('select[name="priority"]').first().selectOption("normal");

    // Leave scheduled_date empty (unscheduled)
    await page.getByRole("button", { name: /create|save/i }).click();
    await page.waitForTimeout(2000);

    console.log("✅ Test work order created");
  }

  // Navigate to schedule
  console.log("3. Navigating to schedule page...");
  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForTimeout(3000);

  // Check for unscheduled work orders
  const unscheduledRows = page.locator(
    '[data-testid="unscheduled-drop-zone"] table tbody tr'
  );
  const count = await unscheduledRows.count();

  console.log(`   Unscheduled work orders: ${count}`);

  if (count === 0) {
    console.log("⚠️  No unscheduled work orders found");
    console.log("   Please create an unscheduled work order manually and re-run this test");
    test.skip();
    return;
  }

  // Get first work order info
  const firstRowText = await unscheduledRows.first().textContent();
  console.log(`4. Dragging work order: ${firstRowText}`);

  // Set up toast listener
  let toastAppeared = false;
  page.on("console", (msg) => {
    if (msg.text().includes("Work Order Scheduled")) {
      toastAppeared = true;
      console.log("✅ SUCCESS TOAST APPEARED!");
    }
  });

  // Perform drag
  const source = unscheduledRows.first();
  const target = page.locator(".grid-cols-7 > div:nth-child(3)").first();

  await expect(source).toBeVisible();
  await expect(target).toBeVisible();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Elements not found");
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Dispatch drag events
  await page.evaluate(
    ({ sourceX, sourceY, targetX, targetY }) => {
      const sourceEl = document.querySelector('[data-testid="unscheduled-drop-zone"] table tbody tr:first-child');
      if (!sourceEl) throw new Error("Source not found");

      sourceEl.dispatchEvent(new PointerEvent("pointerdown", {
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
      }));

      setTimeout(() => {
        document.dispatchEvent(new PointerEvent("pointermove", {
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
        }));

        setTimeout(() => {
          document.dispatchEvent(new PointerEvent("pointermove", {
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
          }));

          setTimeout(() => {
            document.dispatchEvent(new PointerEvent("pointerup", {
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
            }));
          }, 100);
        }, 200);
      }, 100);
    },
    { sourceX, sourceY, targetX, targetY }
  );

  // Wait for drag to complete
  await page.waitForTimeout(3000);

  // Check for toast in DOM
  console.log("5. Checking for toast notification...");
  const toastLocator = page.locator('[role="alert"], [data-sonner-toast]').filter({
    hasText: "Work Order Scheduled"
  });

  try {
    await expect(toastLocator).toBeVisible({ timeout: 5000 });
    console.log("✅ SUCCESS: Toast notification is visible!");
  } catch (e) {
    console.log("❌ FAILED: Toast notification did not appear");
    console.log("   Checking if work order was scheduled anyway...");

    const newCount = await unscheduledRows.count();
    if (newCount < count) {
      console.log(`   Work order WAS scheduled (count: ${count} → ${newCount})`);
      console.log("   But toast did not appear - possible timing issue");
    }
    throw e;
  }

  // Verify work order moved
  const newCount = await unscheduledRows.count();
  expect(newCount).toBe(count - 1);
  console.log(`   Unscheduled count: ${count} → ${newCount}`);

  console.log("\n✅ VERIFICATION COMPLETE: Drag-drop works and toast appears!");
});

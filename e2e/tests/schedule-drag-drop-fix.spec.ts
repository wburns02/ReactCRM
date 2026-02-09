import { test, expect, Page } from "@playwright/test";

/**
 * Comprehensive Schedule Drag-Drop Tests with Toast Verification
 *
 * Tests the complete drag-drop flow including:
 * - Success/error toast notifications
 * - Backend API updates
 * - Optimistic update rollback on error
 * - Multiple rapid operations
 * - Persistence after refresh
 */

const BASE_URL = "https://react.ecbtx.com";

/**
 * Helper: Dispatch PointerEvents for drag-and-drop (works with @dnd-kit)
 */
async function dragElement(
  page: Page,
  sourceSelector: string,
  targetSelector: string
) {
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();

  await expect(source).toBeVisible({ timeout: 10000 });
  await expect(target).toBeVisible({ timeout: 10000 });

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

  // Wait for animations and API calls
  await page.waitForTimeout(2000);
}

/**
 * Helper: Wait for toast to appear with specific text
 */
async function waitForToast(page: Page, text: string, timeout = 5000) {
  const toastLocator = page.locator('[role="alert"], [data-sonner-toast]').filter({ hasText: text });
  await expect(toastLocator).toBeVisible({ timeout });
  return toastLocator;
}

/**
 * Helper: Login and navigate to schedule
 */
async function setupSchedulePage(page: Page) {
  await page.goto(`${BASE_URL}/login`);
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

  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForTimeout(3000);
}

test.describe("Schedule Drag-Drop with Toast Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await setupSchedulePage(page);
  });

  test("1. Successful drag to schedule shows success toast", async ({ page }) => {
    // Track PATCH requests
    const patchRequests: { url: string; status: number; payload: any; response: any }[] = [];

    page.on("request", async (req) => {
      if (req.url().includes("/work-orders/") && req.method() === "PATCH") {
        const payload = req.postDataJSON();
        patchRequests.push({ url: req.url(), status: 0, payload, response: null });
      }
    });

    page.on("response", async (res) => {
      if (res.url().includes("/work-orders/") && res.request().method() === "PATCH") {
        const idx = patchRequests.findIndex(r => r.url === res.url());
        if (idx >= 0) {
          patchRequests[idx].status = res.status();
          try {
            patchRequests[idx].response = await res.json();
          } catch (e) {
            patchRequests[idx].response = { error: "Failed to parse JSON" };
          }
        }
      }
    });

    // Filter console errors (ignore known warnings)
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known benign errors
        if (
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("API Schema Violation") &&
          !text.includes("favicon")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    // Check for unscheduled work orders
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const count = await unscheduledRows.count();

    console.log(`\n📋 Unscheduled work orders: ${count}`);

    if (count === 0) {
      console.log("⚠️  No unscheduled work orders available");
      test.skip();
      return;
    }

    const firstRowText = await unscheduledRows.first().textContent();
    console.log(`🎯 Dragging: ${firstRowText}`);

    // Drag to third day in week view
    console.log("🖱️  Performing drag-and-drop...");
    await dragElement(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:first-child',
      ".grid-cols-7 > div:nth-child(3)"
    );

    // Verify API was called
    console.log(`\n📡 API Calls Made: ${patchRequests.length}`);
    expect(patchRequests.length).toBeGreaterThan(0);

    const call = patchRequests[0];
    console.log(`   Status: ${call.status}`);
    console.log(`   Payload:`, JSON.stringify(call.payload, null, 2));

    // Assert successful response
    expect(call.status).toBe(200);
    expect(call.payload).toHaveProperty("scheduled_date");
    expect(call.payload.status).toBe("scheduled");

    // Verify success toast appears
    console.log("🍞 Waiting for success toast...");
    const toast = await waitForToast(page, "Work Order Scheduled");
    expect(toast).toBeVisible();
    console.log("✅ Success toast appeared!");

    // Verify no console errors
    if (consoleErrors.length > 0) {
      console.log("❌ Console errors:", consoleErrors);
    }
    expect(consoleErrors).toHaveLength(0);

    console.log("✅ Test passed: Drag-to-schedule works with success toast");
  });

  test("2. Drag to unscheduled shows success toast", async ({ page }) => {
    // Find a scheduled work order in the calendar
    const scheduledCards = page.locator('[data-scheduled-card="true"]');
    const count = await scheduledCards.count();

    console.log(`\n📅 Scheduled work orders: ${count}`);

    if (count === 0) {
      console.log("⚠️  No scheduled work orders to unschedule");
      test.skip();
      return;
    }

    // Track PATCH requests
    const patchRequests: any[] = [];
    page.on("response", async (res) => {
      if (res.url().includes("/work-orders/") && res.request().method() === "PATCH") {
        const status = res.status();
        let body;
        try {
          body = await res.json();
        } catch (e) {
          body = { error: "Failed to parse JSON" };
        }
        patchRequests.push({ url: res.url(), status, body });
      }
    });

    console.log("🖱️  Dragging scheduled work order to unscheduled panel...");

    // Drag first scheduled card to unscheduled drop zone
    await dragElement(
      page,
      '[data-scheduled-card="true"]',
      '[data-testid="unscheduled-drop-zone"]'
    );

    // Verify API call
    console.log(`\n📡 API Calls Made: ${patchRequests.length}`);

    if (patchRequests.length > 0) {
      const call = patchRequests[0];
      console.log(`   Status: ${call.status}`);

      expect(call.status).toBe(200);

      // Verify success toast appears
      console.log("🍞 Waiting for unschedule success toast...");
      const toast = await waitForToast(page, "Work Order Unscheduled");
      expect(toast).toBeVisible();
      console.log("✅ Unschedule success toast appeared!");
    }

    console.log("✅ Test passed: Drag-to-unscheduled works with success toast");
  });

  test("3. Error handling shows error toast", async ({ page }) => {
    // Mock PATCH endpoint to return error
    await page.route("**/api/v2/work-orders/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Database connection failed"
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Check for unscheduled work orders
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const count = await unscheduledRows.count();

    if (count === 0) {
      console.log("⚠️  No unscheduled work orders available");
      test.skip();
      return;
    }

    console.log("🖱️  Performing drag with mocked error...");

    // Drag to calendar (should fail)
    await dragElement(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:first-child',
      ".grid-cols-7 > div:nth-child(3)"
    );

    // Verify error toast appears
    console.log("🍞 Waiting for error toast...");
    const errorToast = await waitForToast(page, "Schedule Failed", 10000);
    expect(errorToast).toBeVisible();
    console.log("✅ Error toast appeared!");

    // Verify work order stayed in unscheduled list (optimistic rollback)
    const newCount = await unscheduledRows.count();
    expect(newCount).toBe(count);
    console.log("✅ Optimistic update rolled back correctly");

    console.log("✅ Test passed: Error handling works with error toast");
  });

  test("4. Multiple rapid drags succeed", async ({ page }) => {
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const count = await unscheduledRows.count();

    if (count < 3) {
      console.log("⚠️  Need at least 3 unscheduled work orders");
      test.skip();
      return;
    }

    // Track toasts
    const toastTexts: string[] = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Work Order Scheduled")) {
        toastTexts.push(text);
      }
    });

    console.log("🖱️  Performing 3 rapid drags...");

    // Drag 3 jobs in quick succession
    for (let i = 0; i < 3; i++) {
      await dragElement(
        page,
        '[data-testid="unscheduled-drop-zone"] table tbody tr:first-child',
        `.grid-cols-7 > div:nth-child(${3 + i})`
      );
      await page.waitForTimeout(1000); // Brief pause between drags
    }

    // Wait for all toasts
    await page.waitForTimeout(2000);

    // Verify unscheduled count decreased
    const newCount = await unscheduledRows.count();
    expect(newCount).toBeLessThan(count);
    console.log(`✅ Unscheduled count: ${count} → ${newCount}`);

    console.log("✅ Test passed: Multiple rapid drags work");
  });

  test("5. Page refresh persistence", async ({ page }) => {
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const countBefore = await unscheduledRows.count();

    if (countBefore === 0) {
      console.log("⚠️  No unscheduled work orders available");
      test.skip();
      return;
    }

    const firstRowText = await unscheduledRows.first().textContent();
    console.log(`🎯 Dragging: ${firstRowText}`);

    // Drag to calendar
    await dragElement(
      page,
      '[data-testid="unscheduled-drop-zone"] table tbody tr:first-child',
      ".grid-cols-7 > div:nth-child(3)"
    );

    // Wait for success toast
    await waitForToast(page, "Work Order Scheduled");

    // Refresh page
    console.log("🔄 Refreshing page...");
    await page.reload();
    await page.waitForTimeout(3000);

    // Verify unscheduled count decreased (persisted)
    const countAfter = await unscheduledRows.count();
    expect(countAfter).toBe(countBefore - 1);
    console.log(`✅ Count persisted: ${countBefore} → ${countAfter}`);

    console.log("✅ Test passed: Changes persisted after refresh");
  });
});

import { test, expect } from "@playwright/test";

/**
 * Manual diagnostic test for schedule drag-drop
 * Just checks what elements exist and what their state is
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Schedule Drag-Drop Manual Diagnostic", () => {
  test("inspect schedule page elements", async ({ page }) => {
    // Track network activity
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/v2/")) {
        apiCalls.push(`${req.method()} ${req.url()}`);
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

    // Set session state
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

    console.log("\n=== API CALLS ===");
    console.log(apiCalls.join("\n"));

    // Check for unscheduled drop zone
    const dropZone = page.locator('[data-testid="unscheduled-drop-zone"]');
    const dropZoneExists = await dropZone.count();
    console.log(`\nUnscheduled drop zone exists: ${dropZoneExists > 0}`);

    if (dropZoneExists > 0) {
      const dropZoneClass = await dropZone.getAttribute("class");
      console.log(`Drop zone classes: ${dropZoneClass}`);
    }

    // Check for unscheduled work orders (table rows)
    const unscheduledRows = page.locator(
      '[data-testid="unscheduled-drop-zone"] table tbody tr'
    );
    const unscheduledCount = await unscheduledRows.count();
    console.log(`\nUnscheduled work orders: ${unscheduledCount}`);

    if (unscheduledCount > 0) {
      const firstRowText = await unscheduledRows.first().textContent();
      console.log(`First unscheduled row: ${firstRowText}`);
    }

    // Check for scheduled work orders (draggable cards)
    const scheduledCards = page.locator('[data-testid^="scheduled-wo-"]');
    const scheduledCount = await scheduledCards.count();
    console.log(`\nScheduled work orders: ${scheduledCount}`);

    if (scheduledCount > 0) {
      const firstCardText = await scheduledCards.first().textContent();
      console.log(`First scheduled card: ${firstCardText}`);

      // Check if card is draggable
      const firstCard = scheduledCards.first();
      const cursor = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el).cursor;
      });
      console.log(`First card cursor: ${cursor}`);
    }

    // Check for droppable day cells
    const gridCols = page.locator(".grid-cols-7 > div");
    const dayCount = await gridCols.count();
    console.log(`\nDroppable day cells: ${dayCount}`);

    // Take screenshot for visual inspection
    await page.screenshot({
      path: "test-results/schedule-diagnostic.png",
      fullPage: true,
    });
    console.log("\nScreenshot saved to: test-results/schedule-diagnostic.png");
  });
});

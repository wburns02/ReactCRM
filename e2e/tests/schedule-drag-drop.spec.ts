import { test, expect } from "@playwright/test";

/**
 * E2E tests for Schedule drag-and-drop functionality
 *
 * Tests bidirectional drag-drop:
 * 1. Unscheduled -> Schedule (assign to date/tech)
 * 2. Schedule -> Unscheduled (remove from schedule)
 */

const PRODUCTION_URL = "https://react.ecbtx.com";

test.describe("Schedule Drag and Drop", () => {
  test.beforeEach(async ({ page }) => {
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
    await page.waitForTimeout(2000);
  });

  test("can drag scheduled work order to unscheduled zone", async ({
    page,
  }) => {
    // Track API calls
    let unschedulePatchSent = false;
    let unschedulePatchStatus = 0;

    page.on("response", async (res) => {
      if (
        res.url().includes("/work-orders/") &&
        res.request().method() === "PATCH"
      ) {
        const body = res.request().postData() || "";
        if (body.includes('"scheduled_date":null')) {
          unschedulePatchSent = true;
          unschedulePatchStatus = res.status();
        }
      }
    });

    // Check for scheduled work orders
    const scheduledCards = page.locator('[data-testid^="scheduled-wo-"]');
    const initialCount = await scheduledCards.count();

    if (initialCount === 0) {
      console.log("No scheduled work orders to test. Skipping.");
      test.skip();
      return;
    }

    // Get elements
    const dropZone = page.locator('[data-testid="unscheduled-drop-zone"]');
    await expect(dropZone).toBeVisible();

    const firstScheduled = scheduledCards.first();
    const dropZoneBox = await dropZone.boundingBox();
    const cardBox = await firstScheduled.boundingBox();

    expect(dropZoneBox).toBeTruthy();
    expect(cardBox).toBeTruthy();

    // Perform drag
    await firstScheduled.hover();
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

    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Verify API call
    expect(unschedulePatchSent).toBe(true);
    expect(unschedulePatchStatus).toBe(200);

    // Verify card moved
    const finalCount = await scheduledCards.count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test("can drag unscheduled work order to schedule", async ({ page }) => {
    // Track API calls
    let schedulePatchSent = false;
    let schedulePatchStatus = 0;

    page.on("response", async (res) => {
      if (
        res.url().includes("/work-orders/") &&
        res.request().method() === "PATCH"
      ) {
        const body = res.request().postData() || "";
        if (
          body.includes("scheduled_date") &&
          !body.includes('"scheduled_date":null')
        ) {
          schedulePatchSent = true;
          schedulePatchStatus = res.status();
        }
      }
    });

    // Check for unscheduled work orders in the table
    const unscheduledTable = page.locator(
      '[data-testid="unscheduled-drop-zone"]'
    );
    await expect(unscheduledTable).toBeVisible();

    const unscheduledRows = unscheduledTable.locator("table tbody tr");
    const initialUnscheduledCount = await unscheduledRows.count();

    if (initialUnscheduledCount === 0) {
      console.log("No unscheduled work orders to test. Skipping.");
      test.skip();
      return;
    }

    // Get a droppable day cell in week view (Card components inside the grid)
    // Week view has a 7-column grid of Card components
    const gridCols = page.locator('.grid-cols-7 > div');
    const dayCount = await gridCols.count();

    if (dayCount === 0) {
      console.log("No droppable day cells found. Skipping.");
      test.skip();
      return;
    }

    const firstUnscheduled = unscheduledRows.first();
    const targetDay = gridCols.first();

    const unscheduledBox = await firstUnscheduled.boundingBox();
    const dayBox = await targetDay.boundingBox();

    expect(unscheduledBox).toBeTruthy();
    expect(dayBox).toBeTruthy();

    // Perform drag
    await firstUnscheduled.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);

    await page.mouse.move(
      dayBox!.x + dayBox!.width / 2,
      dayBox!.y + dayBox!.height / 2,
      { steps: 20 }
    );
    await page.waitForTimeout(500);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Verify API call
    expect(schedulePatchSent).toBe(true);
    expect(schedulePatchStatus).toBe(200);

    // Verify row count changed
    const finalUnscheduledCount = await unscheduledRows.count();
    expect(finalUnscheduledCount).toBe(initialUnscheduledCount - 1);
  });

  test("unscheduled drop zone shows visual feedback on hover", async ({
    page,
  }) => {
    const scheduledCards = page.locator('[data-testid^="scheduled-wo-"]');
    const count = await scheduledCards.count();

    if (count === 0) {
      console.log("No scheduled work orders. Skipping.");
      test.skip();
      return;
    }

    const dropZone = page.locator('[data-testid="unscheduled-drop-zone"]');
    const dropZoneBox = await dropZone.boundingBox();
    expect(dropZoneBox).toBeTruthy();

    // Start drag
    const firstCard = scheduledCards.first();
    await firstCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move to drop zone
    await page.mouse.move(
      dropZoneBox!.x + 100,
      dropZoneBox!.y + dropZoneBox!.height / 2,
      { steps: 10 }
    );
    await page.waitForTimeout(300);

    // Check visual state
    const classes = await dropZone.getAttribute("class");
    expect(classes).toContain("ring-2");
    expect(classes).toContain("ring-primary");

    // Cancel drag
    await page.keyboard.press("Escape");
  });

  test("bidirectional drag: schedule then unschedule", async ({ page }) => {
    // This test does a full round-trip: unscheduled -> scheduled -> unscheduled

    // First, check if we have an unscheduled item to work with
    const unscheduledTable = page.locator(
      '[data-testid="unscheduled-drop-zone"]'
    );
    const unscheduledRows = unscheduledTable.locator("table tbody tr");
    const initialUnscheduledCount = await unscheduledRows.count();

    if (initialUnscheduledCount === 0) {
      console.log("No unscheduled work orders. Skipping.");
      test.skip();
      return;
    }

    // Find a droppable day (Card components in the 7-column grid)
    const gridCols = page.locator('.grid-cols-7 > div');
    if ((await gridCols.count()) === 0) {
      test.skip();
      return;
    }

    // Step 1: Drag from unscheduled to schedule
    console.log("Step 1: Scheduling work order...");
    const firstUnscheduled = unscheduledRows.first();
    const targetDay = gridCols.first();

    const unscheduledBox = await firstUnscheduled.boundingBox();
    const dayBox = await targetDay.boundingBox();

    await firstUnscheduled.hover();
    await page.mouse.down();
    await page.mouse.move(
      dayBox!.x + dayBox!.width / 2,
      dayBox!.y + dayBox!.height / 2,
      { steps: 20 }
    );
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Verify it scheduled
    const scheduledCards = page.locator('[data-testid^="scheduled-wo-"]');
    const scheduledCount = await scheduledCards.count();
    expect(scheduledCount).toBeGreaterThan(0);

    // Step 2: Drag back to unscheduled
    console.log("Step 2: Unscheduling work order...");
    const dropZone = page.locator('[data-testid="unscheduled-drop-zone"]');
    const dropZoneBox = await dropZone.boundingBox();

    const scheduledCard = scheduledCards.first();
    await scheduledCard.hover();
    await page.mouse.down();
    await page.mouse.move(
      dropZoneBox!.x + 100,
      dropZoneBox!.y + dropZoneBox!.height / 2,
      { steps: 20 }
    );
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Verify it unscheduled - check that scheduled count decreased
    const finalScheduledCount = await scheduledCards.count();
    expect(finalScheduledCount).toBe(scheduledCount - 1);

    console.log("Bidirectional drag-drop working correctly!");
  });
});

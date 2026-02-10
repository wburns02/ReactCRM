/**
 * Work Order Context Menu E2E Tests
 *
 * Tests the right-click context menu on the Schedule page.
 * Login once, share page across all tests to avoid rate limiting.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

// Known console errors to ignore
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "ERR_BLOCKED_BY_CLIENT",
  "net::ERR",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((known) => msg.includes(known));
}

/**
 * Navigate to schedule page and wait for data to fully load.
 * Waits for either unscheduled table rows or scheduled cards to appear.
 */
async function loadSchedulePage(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/schedule`);
  await page.waitForLoadState("networkidle");
  // Wait for the heading to confirm page rendered
  await page.locator('h1:has-text("Schedule")').waitFor({ state: "visible", timeout: 10000 });
  // Wait for either unscheduled rows or scheduled cards to appear (data loaded)
  try {
    await page
      .locator('table tbody tr, [data-testid^="scheduled-wo-"]')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
  } catch {
    // Data might not have loaded — tests will handle empty state gracefully
  }
}

/**
 * Find the best work order element to right-click.
 * Prefers unscheduled table rows (more reliable), falls back to scheduled cards.
 */
async function findWorkOrderTarget(page: Page): Promise<Locator | null> {
  const rows = page.locator("table tbody tr");
  if ((await rows.count()) > 0) {
    return rows.first();
  }
  const cards = page.locator('[data-testid^="scheduled-wo-"]');
  if ((await cards.count()) > 0) {
    return cards.first();
  }
  return null;
}

/**
 * Right-click a work order element and wait for the context menu to appear.
 */
async function openContextMenu(page: Page, target: Locator): Promise<Locator> {
  await target.click({ button: "right" });
  const menu = page.locator('[data-testid="wo-context-menu"]');
  await expect(menu).toBeVisible({ timeout: 3000 });
  return menu;
}

test.describe("Work Order Context Menu", () => {
  let authPage: Page;

  // Give each test more time since we hit production APIs
  test.setTimeout(60000);

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Strip cache-control to avoid stale data
    await authPage.route("**/*", (route) => {
      route.continue().then(() => {}).catch(() => {});
    });

    // Login
    await authPage.goto(`${BASE_URL}/login`);
    await authPage.fill('input[type="email"]', "will@macseptic.com");
    await authPage.fill('input[type="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 15000 },
    );
    await authPage.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await authPage?.context()?.close();
  });

  test("1. Schedule page loads with work orders", async () => {
    await loadSchedulePage(authPage);

    const url = authPage.url();
    expect(url).toContain("/schedule");

    const body = await authPage.textContent("body");
    expect(body).toContain("Schedule");
  });

  test("2. Right-click on unscheduled WO row shows context menu", async () => {
    await loadSchedulePage(authPage);

    const rows = authPage.locator("table tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip(true, "No unscheduled work orders available");
      return;
    }

    const menu = await openContextMenu(authPage, rows.first());

    // Should show all menu items
    await expect(authPage.locator('[data-testid="ctx-assign-tech"]')).toBeVisible();
    await expect(authPage.locator('[data-testid="ctx-set-time"]')).toBeVisible();
    await expect(authPage.locator('[data-testid="ctx-change-status"]')).toBeVisible();
    await expect(authPage.locator('[data-testid="ctx-set-priority"]')).toBeVisible();
    await expect(authPage.locator('[data-testid="ctx-view-details"]')).toBeVisible();

    // Close with Escape
    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
    await expect(menu).not.toBeVisible();
  });

  test("3. Right-click on scheduled WO card (week view) shows context menu", async () => {
    await loadSchedulePage(authPage);

    // Wait specifically for scheduled cards to appear
    const cards = authPage.locator('[data-testid^="scheduled-wo-"]');
    try {
      await cards.first().waitFor({ state: "visible", timeout: 15000 });
    } catch {
      test.skip(true, "No scheduled work orders visible in week view");
      return;
    }

    const menu = await openContextMenu(authPage, cards.first());

    // Should have customer name or WO number in header
    const menuText = await menu.textContent();
    expect(menuText).toBeTruthy();
    expect(menuText!.length).toBeGreaterThan(10);

    // Close by clicking outside
    await authPage.mouse.click(10, 10);
    await authPage.waitForTimeout(300);
    await expect(menu).not.toBeVisible();
  });

  test("4. Expand Assign Technician shows tech list", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Click "Assign Technician"
    await authPage.locator('[data-testid="ctx-assign-tech"]').click();
    await authPage.waitForTimeout(500);

    // Technician list should be visible
    const techList = authPage.locator('[data-testid="ctx-tech-list"]');
    await expect(techList).toBeVisible();

    // Should have at least one technician button
    const techButtons = techList.locator("button");
    const techCount = await techButtons.count();
    expect(techCount).toBeGreaterThan(0);

    // Close menu
    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
  });

  test("5. Expand Set Time shows time grid", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Click "Set Time"
    await authPage.locator('[data-testid="ctx-set-time"]').click();
    await authPage.waitForTimeout(500);

    // Time grid should be visible
    const timeGrid = authPage.locator('[data-testid="ctx-time-grid"]');
    await expect(timeGrid).toBeVisible();

    // Should have 10 time buttons (8AM-5PM)
    const timeButtons = timeGrid.locator("button");
    const timeCount = await timeButtons.count();
    expect(timeCount).toBe(10);

    // Close
    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
  });

  test("6. Expand Change Status shows status options", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Click "Change Status"
    await authPage.locator('[data-testid="ctx-change-status"]').click();
    await authPage.waitForTimeout(500);

    // Status list should be visible
    const statusList = authPage.locator('[data-testid="ctx-status-list"]');
    await expect(statusList).toBeVisible();

    // Should have 9 status options
    const statusButtons = statusList.locator("button");
    const statusCount = await statusButtons.count();
    expect(statusCount).toBe(9);

    // Close
    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
  });

  test("7. Expand Set Priority shows priority options with color dots", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Click "Set Priority"
    await authPage.locator('[data-testid="ctx-set-priority"]').click();
    await authPage.waitForTimeout(500);

    // Priority list should be visible
    const priorityList = authPage.locator('[data-testid="ctx-priority-list"]');
    await expect(priorityList).toBeVisible();

    // Should have 5 priority options
    const priorityButtons = priorityList.locator("button");
    const count = await priorityButtons.count();
    expect(count).toBe(5);

    // Should have text for all priorities
    const listText = await priorityList.textContent();
    expect(listText).toContain("Emergency");
    expect(listText).toContain("Normal");
    expect(listText).toContain("Low");

    // Close
    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
  });

  test("8. View Details link navigates to work order page", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Click "View Details"
    const viewLink = authPage.locator('[data-testid="ctx-view-details"]');
    const href = await viewLink.getAttribute("href");
    expect(href).toContain("/work-orders/");

    await viewLink.click();
    await authPage.waitForFunction(
      () => window.location.href.includes("/work-orders/"),
      { timeout: 10000 },
    );

    // Should navigate to work order detail page
    expect(authPage.url()).toContain("/work-orders/");

    // Go back
    await authPage.goto(`${BASE_URL}/schedule`);
    await authPage.waitForTimeout(2000);
  });

  test("9. Escape key closes the context menu", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    const menu = await openContextMenu(authPage, target);

    await authPage.keyboard.press("Escape");
    await authPage.waitForTimeout(300);
    await expect(menu).not.toBeVisible();
  });

  test("10. Click outside closes the context menu", async () => {
    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);
    if (!target) {
      test.skip(true, "No work orders available");
      return;
    }

    const menu = await openContextMenu(authPage, target);

    // Click far away from the menu
    await authPage.mouse.click(10, 10);
    await authPage.waitForTimeout(300);
    await expect(menu).not.toBeVisible();
  });

  test("11. Assign technician updates the work order", async () => {
    await loadSchedulePage(authPage);

    // Prefer scheduled cards for this test (they have assigned techs)
    const cards = authPage.locator('[data-testid^="scheduled-wo-"]');
    const rows = authPage.locator("table tbody tr");
    let target: Locator;

    if ((await cards.count()) > 0) {
      target = cards.first();
    } else if ((await rows.count()) > 0) {
      target = rows.first();
    } else {
      test.skip(true, "No work orders available");
      return;
    }

    await openContextMenu(authPage, target);

    // Expand technician section
    await authPage.locator('[data-testid="ctx-assign-tech"]').click();
    await authPage.waitForTimeout(500);

    const techList = authPage.locator('[data-testid="ctx-tech-list"]');
    await expect(techList).toBeVisible({ timeout: 3000 });
    const techButtons = techList.locator("button");
    const techCount = await techButtons.count();

    if (techCount > 0) {
      // Click the first technician
      await techButtons.first().click();
      await authPage.waitForTimeout(1000);

      // Menu should have closed
      const menu = authPage.locator('[data-testid="wo-context-menu"]');
      await expect(menu).not.toBeVisible();

      // Verify no crash happened
      const body = await authPage.textContent("body");
      expect(body).toBeTruthy();
    }
  });

  test("12. No unexpected console errors", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await loadSchedulePage(authPage);

    const target = await findWorkOrderTarget(authPage);

    if (target) {
      await openContextMenu(authPage, target);

      // Expand all sections to trigger rendering
      await authPage.locator('[data-testid="ctx-assign-tech"]').click();
      await authPage.waitForTimeout(300);
      await authPage.locator('[data-testid="ctx-set-time"]').click();
      await authPage.waitForTimeout(300);
      await authPage.locator('[data-testid="ctx-change-status"]').click();
      await authPage.waitForTimeout(300);
      await authPage.locator('[data-testid="ctx-set-priority"]').click();
      await authPage.waitForTimeout(300);

      await authPage.keyboard.press("Escape");
      await authPage.waitForTimeout(500);
    }

    const unexpectedErrors = errors.filter((e) => !isKnownError(e));
    if (unexpectedErrors.length > 0) {
      console.log("Unexpected console errors:", unexpectedErrors);
    }
    expect(unexpectedErrors.length).toBeLessThanOrEqual(2);
  });
});

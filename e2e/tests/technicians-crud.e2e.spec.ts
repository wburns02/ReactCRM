import { test, expect, Page, Browser } from "@playwright/test";

/**
 * Technicians CRUD E2E Tests (serial, shared browser)
 *
 * Shares a single browser page across all tests to avoid:
 * - Rate-limiting on login endpoint (only logs in once)
 * - State loss between create → edit → delete
 *
 * Uses will@macseptic.com (admin) for full CRUD access.
 */

const APP_URL = "https://react.ecbtx.com";

const KNOWN_CONSOLE_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
];

test.describe.serial("Technicians CRUD", () => {
  test.setTimeout(90000);

  const suffix = Date.now().toString().slice(-6);
  const testFirstName = "E2ETest";
  const testLastName = `Tech${suffix}`;
  const testEmail = `e2e-${suffix}@test.com`;

  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    sharedPage = await context.newPage();

    // Login once
    await sharedPage.goto(`${APP_URL}/technicians`, {
      waitUntil: "domcontentloaded",
    });
    await sharedPage.waitForTimeout(3000);

    if (sharedPage.url().includes("/login")) {
      await sharedPage.fill('input[type="email"]', "will@macseptic.com");
      await sharedPage.fill('input[type="password"]', "#Espn2025");
      await sharedPage.click('button[type="submit"]');

      await sharedPage.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
      await sharedPage.waitForTimeout(2000);

      // Navigate to technicians if redirected elsewhere
      if (!sharedPage.url().includes("/technicians")) {
        await sharedPage.goto(`${APP_URL}/technicians`, {
          waitUntil: "domcontentloaded",
        });
        await sharedPage.waitForTimeout(2000);
      }
    }
  });

  test.afterAll(async () => {
    await sharedPage?.context().close();
  });

  test("technicians page loads with list data", async () => {
    const page = sharedPage;
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !KNOWN_CONSOLE_ERRORS.some((known) => msg.text().includes(known))
      ) {
        consoleErrors.push(msg.text());
      }
    });

    // Page title
    await expect(page.locator("h1")).toContainText("Technicians");

    // Table should have rows
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    expect(consoleErrors).toHaveLength(0);
  });

  test("create technician returns 201 and row appears", async () => {
    const page = sharedPage;
    let createStatus = 0;
    const serverErrors: string[] = [];

    const responseHandler = (response: any) => {
      if (
        response.url().includes("/technicians") &&
        response.request().method() === "POST"
      ) {
        createStatus = response.status();
      }
      if (response.status() >= 500) {
        serverErrors.push(
          `${response.request().method()} ${response.url()} → ${response.status()}`,
        );
      }
    };
    page.on("response", responseHandler);

    // Ensure we're on the technicians page
    if (!page.url().includes("/technicians")) {
      await page.goto(`${APP_URL}/technicians`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(2000);
    }

    // Click Add Technician
    await page.click('button:has-text("Add Technician")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill form
    await page.fill("#first_name", testFirstName);
    await page.fill("#last_name", testLastName);
    await page.fill("#email", testEmail);
    await page.fill("#phone", "555-0199");

    // Submit and wait for response
    await page.click('button[type="submit"]:has-text("Create Technician")');

    // Wait for the POST response
    await page.waitForTimeout(4000);

    // Verify 201
    expect(createStatus).toBe(201);
    expect(serverErrors).toHaveLength(0);

    // Verify toast
    await expect(
      page.locator("text=Technician created").first(),
    ).toBeVisible({ timeout: 5000 });

    // Use search to find the new technician (bypasses browser HTTP cache)
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"]',
    );
    await searchInput.fill(testLastName);
    await page.waitForTimeout(2000); // debounce

    await expect(
      page.locator(`table tbody tr:has-text("${testLastName}")`),
    ).toBeVisible({ timeout: 10000 });

    // Clear search for subsequent tests
    await searchInput.clear();
    await page.waitForTimeout(1000);

    page.removeListener("response", responseHandler);
  });

  test("edit technician returns 200 and updates visible", async () => {
    const page = sharedPage;
    let patchStatus = 0;

    const responseHandler = (response: any) => {
      if (
        response.url().includes("/technicians/") &&
        response.request().method() === "PATCH"
      ) {
        patchStatus = response.status();
      }
    };
    page.on("response", responseHandler);

    // Search for our test technician to bypass cache
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"]',
    );
    await searchInput.fill(testLastName);
    await page.waitForTimeout(2000);

    // Find the test row and click Edit
    const testRow = page.locator(
      `table tbody tr:has-text("${testLastName}")`,
    );
    await expect(testRow).toBeVisible({ timeout: 10000 });
    await testRow.locator('button:has-text("Edit")').click();

    // Wait for edit dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Update phone
    const phoneInput = page.locator("#phone");
    await phoneInput.clear();
    await phoneInput.fill("555-0200");

    // Save
    await page.click('button[type="submit"]:has-text("Save Changes")');
    await page.waitForTimeout(4000);

    // Verify 200
    expect(patchStatus).toBe(200);

    // Verify toast
    await expect(
      page.locator("text=Technician updated").first(),
    ).toBeVisible({ timeout: 5000 });

    page.removeListener("response", responseHandler);
  });

  test("delete technician returns 204 and row is removed", async () => {
    const page = sharedPage;
    let deleteStatus = 0;

    const responseHandler = (response: any) => {
      if (
        response.url().includes("/technicians/") &&
        response.request().method() === "DELETE"
      ) {
        deleteStatus = response.status();
      }
    };
    page.on("response", responseHandler);

    // Search for test technician to bypass cache
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Search"]',
    );
    await searchInput.fill(testLastName);
    await page.waitForTimeout(2000);

    // Wait for table
    await expect(
      page.locator("table tbody tr").first(),
    ).toBeVisible({ timeout: 10000 });

    // Find test row and click Delete
    const testRow = page.locator(
      `table tbody tr:has-text("${testLastName}")`,
    );
    await expect(testRow).toBeVisible({ timeout: 10000 });
    await testRow.locator('button:has-text("Delete")').click();

    // Confirm in dialog
    await page.waitForSelector(
      '[role="dialog"]:has-text("Delete Technician")',
      { timeout: 5000 },
    );
    await page
      .locator('[role="dialog"] button:has-text("Delete")')
      .click();
    await page.waitForTimeout(4000);

    // Verify 204
    expect(deleteStatus).toBe(204);

    // Verify toast
    await expect(
      page.locator("text=Technician deactivated").first(),
    ).toBeVisible({ timeout: 5000 });

    // Verify row is gone (active_only=true by default)
    await page.waitForTimeout(2000);
    await expect(
      page.locator(`table tbody tr:has-text("${testLastName}")`),
    ).toHaveCount(0);

    page.removeListener("response", responseHandler);
  });

  test("no 500 errors on page load and reload", async () => {
    const page = sharedPage;
    const serverErrors: string[] = [];

    const responseHandler = (response: any) => {
      if (response.status() >= 500) {
        serverErrors.push(
          `${response.request().method()} ${response.url()} → ${response.status()}`,
        );
      }
    };
    page.on("response", responseHandler);

    await page.goto(`${APP_URL}/technicians`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    await page.reload();
    await page.waitForTimeout(3000);

    expect(serverErrors).toHaveLength(0);
    page.removeListener("response", responseHandler);
  });

  test("invalid create shows validation error, not 500", async () => {
    const page = sharedPage;
    const serverErrors: string[] = [];

    const responseHandler = (response: any) => {
      if (response.status() >= 500) {
        serverErrors.push(
          `${response.request().method()} ${response.url()} → ${response.status()}`,
        );
      }
    };
    page.on("response", responseHandler);

    // Open create form
    await page.click('button:has-text("Add Technician")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Submit with empty required fields
    await page.click(
      'button[type="submit"]:has-text("Create Technician")',
    );
    await page.waitForTimeout(1000);

    // Should show validation (not submit to server) or get 4xx, never 500
    expect(serverErrors).toHaveLength(0);
    page.removeListener("response", responseHandler);
  });
});

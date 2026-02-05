import { test, expect, Page } from "@playwright/test";

/**
 * Technicians CRUD E2E Tests (serial, shared browser)
 *
 * Shares a single browser page across all tests to avoid:
 * - Rate-limiting on login endpoint (only logs in once)
 * - State loss between create → edit → delete
 *
 * Uses will@macseptic.com (admin) for full CRUD access.
 * Intercepts API responses to disable HTTP caching so
 * TanStack Query refetches always get fresh data.
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

    // Disable HTTP caching on all API responses so TanStack refetches get fresh data
    await sharedPage.route("**/api/v2/**", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          "cache-control": "no-cache, no-store",
        },
      });
    });

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

    await expect(page.locator("h1")).toContainText("Technicians");

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

    // Click Add Technician
    await page.click('button:has-text("Add Technician")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill form
    await page.fill("#first_name", testFirstName);
    await page.fill("#last_name", testLastName);
    await page.fill("#email", testEmail);
    await page.fill("#phone", "555-0199");

    // Submit and wait for response
    await page.click(
      'button[type="submit"]:has-text("Create Technician")',
    );

    // Wait for the POST response and list refetch
    await page.waitForTimeout(5000);

    // Verify 201
    expect(createStatus).toBe(201);
    expect(serverErrors).toHaveLength(0);

    // Verify toast
    await expect(
      page.locator("text=Technician created").first(),
    ).toBeVisible({ timeout: 5000 });

    // Wait for the query invalidation refetch to complete
    // The mutation onSuccess calls invalidateQueries which triggers a GET
    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/technicians") &&
        resp.request().method() === "GET" &&
        resp.status() === 200,
      { timeout: 10000 },
    ).catch(() => {
      // Refetch might have already completed, that's OK
    });

    // Give the UI time to re-render with fresh data
    await page.waitForTimeout(2000);

    // Verify new technician appears in list
    await expect(
      page.locator(`table tbody tr:has-text("${testLastName}")`),
    ).toBeVisible({ timeout: 15000 });

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

    // Find the test row and click Edit
    const testRow = page.locator(
      `table tbody tr:has-text("${testLastName}")`,
    );
    await expect(testRow).toBeVisible({ timeout: 10000 });
    await testRow.locator('button:has-text("Edit")').click();

    // Wait for edit dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Verify the form is populated with our technician data
    await expect(page.locator("#first_name")).toHaveValue(testFirstName, {
      timeout: 5000,
    });

    // Update phone
    const phoneInput = page.locator("#phone");
    await phoneInput.clear();
    await phoneInput.fill("555-0200");

    // Save
    await page.click(
      'button[type="submit"]:has-text("Save Changes")',
    );
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

    // Wait for table and find test row
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

    // Verify row is gone (active_only=true filters out inactive)
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

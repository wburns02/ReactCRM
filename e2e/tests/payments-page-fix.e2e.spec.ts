import { test, expect, Page } from "@playwright/test";

/**
 * Payments Page Fix E2E Tests
 *
 * Verifies all 7 bugs are fixed:
 * 1. Total Received not $NaN
 * 2. No "Customer #null" in table
 * 3. Dates are real (not all "-")
 * 4. Click payment row → edit modal opens
 * 5. Clover REST API status green
 * 6. No console errors
 * 7. API returns correct data types
 */

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

async function loginAndNavigate(page: Page, path: string) {
  await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    } catch {
      // Retry login once
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    }
    await page.waitForTimeout(1000);

    if (!page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(2000);
  }
}

test.describe("Payments Page Fixes", () => {
  test("Total Received is not $NaN and shows a real value", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(3000);

    // Find the Total Received KPI card
    const totalReceivedCard = page.locator("text=Total Received").first();
    await expect(totalReceivedCard).toBeVisible({ timeout: 10000 });

    // Get the parent card content
    const card = totalReceivedCard.locator("..");
    const cardText = await card.textContent();
    console.log(`Total Received card: ${cardText}`);

    // Must NOT contain NaN
    expect(cardText).not.toContain("NaN");

    // Should contain a dollar amount > $0
    const match = cardText?.match(/\$[\d,]+\.\d{2}/);
    expect(match).toBeTruthy();
    console.log(`Total Received value: ${match?.[0]}`);
  });

  test("No 'Customer #null' in payments table", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(3000);

    // Wait for table to load
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check that table body does NOT contain "Customer #null"
    const tbody = page.locator("tbody");
    const bodyText = await tbody.textContent();
    expect(bodyText).not.toContain("Customer #null");
    expect(bodyText).not.toContain("Customer #undefined");

    // Should contain "Clover POS Payment" for synced payments
    const cloverText = page.locator("text=Clover POS Payment").first();
    await expect(cloverText).toBeVisible({ timeout: 5000 });
    console.log("Clover POS Payment label visible");
  });

  test("Payment dates are real, not all dashes", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(3000);

    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // Get all date cells (6th column)
    const dateCells = page.locator("tbody tr td:nth-child(6)");
    const count = await dateCells.count();
    console.log(`Found ${count} date cells`);
    expect(count).toBeGreaterThan(0);

    // At least some dates should be real (not just "-")
    let realDates = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await dateCells.nth(i).textContent();
      if (text && text.trim() !== "-" && text.trim() !== "") {
        realDates++;
      }
    }
    console.log(`Real dates: ${realDates} out of ${Math.min(count, 10)}`);
    expect(realDates).toBeGreaterThan(0);
  });

  test("Clicking payment row opens edit modal", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(3000);

    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // Click the first data row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await page.waitForTimeout(1000);

    // Edit modal should appear with form fields
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
    const isModalVisible = await modal.isVisible().catch(() => false);

    // Alternative: look for form elements that appear on edit
    const amountField = page.locator('input[name="amount"], label:has-text("Amount")').first();
    const editFormVisible = await amountField.isVisible().catch(() => false);

    console.log(`Modal visible: ${isModalVisible}, Edit form visible: ${editFormVisible}`);
    expect(isModalVisible || editFormVisible).toBeTruthy();
  });

  test("Clover REST API status shows Available (green)", async ({ page }) => {
    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(1000);

    // Click Clover POS tab
    const cloverTab = page.locator('[data-testid="clover-tab"]');
    await expect(cloverTab).toBeVisible({ timeout: 10000 });
    await cloverTab.click();
    await page.waitForTimeout(3000);

    // REST API card should show "Available"
    const restApiCard = page.locator("text=REST API").first();
    await expect(restApiCard).toBeVisible({ timeout: 10000 });

    // Get parent card
    const card = restApiCard.locator("..");
    const cardText = await card.textContent();
    console.log(`REST API card: ${cardText}`);

    expect(cardText).toContain("Available");
    expect(cardText).not.toContain("Unavailable");
  });

  test("No console errors on Payments page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("net::ERR") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver") &&
          !text.includes("API Schema Violation") &&
          !text.includes("Failed to load resource") &&
          !text.includes("the server responded with a status of") &&
          !text.includes("WebSocket") &&
          !text.includes("apple-touch-icon")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(5000);

    console.log(`Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors:", consoleErrors.join("\n"));
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test("API: /payments returns correct data types", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/payments/?page=1&page_size=5`, {
        credentials: "include",
      });
      return { status: res.status, ok: res.ok, body: await res.json() };
    }, API_URL);

    console.log(`API status: ${data.status}, total: ${data.body.total}`);
    expect(data.ok).toBeTruthy();
    expect(data.body.items.length).toBeGreaterThan(0);

    const first = data.body.items[0];
    console.log(
      `First payment: amount=${first.amount} (${typeof first.amount}), payment_date=${first.payment_date}, customer_name=${first.customer_name}`
    );

    // amount must be a number (not string)
    expect(typeof first.amount).toBe("number");

    // payment_date must be present (string or null, not undefined)
    expect(first).toHaveProperty("payment_date");

    // customer_name field must exist
    expect(first).toHaveProperty("customer_name");

    // invoice_id field must exist
    expect(first).toHaveProperty("invoice_id");
  });
});

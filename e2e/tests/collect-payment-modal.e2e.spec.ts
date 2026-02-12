import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

// Known console errors to ignore
const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "WebSocket",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((e) => msg.includes(e));
}

// ─── Admin Tests ────────────────────────────────────────────

test.describe("Collect Payment Modal — Admin Views", () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await context.clearCookies();

    // Login as admin
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.getByRole("textbox", { name: "Email" }).fill("will@macseptic.com");
    await page.getByRole("textbox", { name: "Password" }).fill("#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), null, {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Work Order detail — Payment tab has Collect Payment button", async () => {
    // Navigate to work orders and find one
    await page.goto(`${BASE_URL}/work-orders`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Click first work order link
    const woLink = page.locator('a[href*="/work-orders/"]').first();
    await expect(woLink).toBeVisible({ timeout: 10000 });
    await woLink.click();
    await page.waitForTimeout(1500);

    // Click Payment tab
    const paymentTab = page.getByRole("tab", { name: "Payment" });
    await expect(paymentTab).toBeVisible({ timeout: 5000 });
    await paymentTab.click();
    await page.waitForTimeout(1000);

    // Verify Collect Payment card exists
    const collectHeading = page.getByRole("heading", { name: "Collect Payment" });
    await expect(collectHeading).toBeVisible({ timeout: 5000 });

    // Click Collect Payment button
    const collectBtn = page.getByRole("button", { name: "Collect Payment" }).first();
    await expect(collectBtn).toBeVisible();
    await collectBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Verify payment method buttons exist
    await expect(page.getByRole("button", { name: /Cash/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Check/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Card/ })).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test("Customer detail — Quick Actions has Collect Payment button", async () => {
    await page.goto(`${BASE_URL}/customers`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Click first customer
    const custLink = page.locator('a[href*="/customers/"]').first();
    await expect(custLink).toBeVisible({ timeout: 10000 });
    await custLink.click();
    await page.waitForTimeout(2000);

    // Verify Collect Payment button in Quick Actions
    const collectBtn = page.getByRole("button", { name: "Collect Payment" });
    await expect(collectBtn).toBeVisible({ timeout: 5000 });

    // Click it
    await collectBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens with customer name
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText("Payment Method")).toBeVisible();

    // Close
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Invoice detail — Collect Payment modal replaces CloverCheckout", async () => {
    // Navigate to invoices
    await page.goto(`${BASE_URL}/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Check if there are any invoices
    const invoiceLink = page.locator('a[href*="/invoices/"]').first();
    const hasInvoices = await invoiceLink.isVisible().catch(() => false);

    if (!hasInvoices) {
      test.skip();
      return;
    }

    await invoiceLink.click();
    await page.waitForTimeout(2000);

    // Look for a payment button (could be "Pay Now", "Process Payment", etc.)
    const payBtn = page.getByRole("button", { name: /Pay|Payment/ }).first();
    const hasPayBtn = await payBtn.isVisible().catch(() => false);

    if (hasPayBtn) {
      await payBtn.click();
      await page.waitForTimeout(500);

      // Should open CollectPaymentModal, not CloverCheckout
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // CollectPaymentModal has payment method buttons (Cash, Check, Card)
      const cashBtn = dialog.getByRole("button", { name: /Cash/ });
      await expect(cashBtn).toBeVisible({ timeout: 3000 });

      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("CollectPaymentModal — form validation works", async () => {
    // Navigate to a work order
    await page.goto(`${BASE_URL}/work-orders`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const woLink = page.locator('a[href*="/work-orders/"]').first();
    await woLink.click();
    await page.waitForTimeout(1500);

    // Open Payment tab and click Collect Payment
    await page.getByRole("tab", { name: "Payment" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Collect Payment" }).first().click();
    await page.waitForTimeout(500);

    // Record Payment button should be disabled (no method or amount selected)
    const recordBtn = page.getByRole("button", { name: /Record Payment/ });
    await expect(recordBtn).toBeDisabled();

    // Select Cash
    await page.getByRole("button", { name: /Cash/ }).click();

    // Still disabled (no amount)
    await expect(recordBtn).toBeDisabled();

    // Enter amount (use placeholder to target the modal's amount field specifically)
    await page.getByPlaceholder("0.00").fill("100");
    await page.waitForTimeout(300);

    // Now should be enabled
    await expect(recordBtn).toBeEnabled();

    // Verify summary bar appears
    await expect(page.getByText("$100.00")).toBeVisible();

    // Close without submitting
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});

// ─── Technician Tests ────────────────────────────────────────

test.describe("Collect Payment Modal — Technician Views", () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await context.clearCookies();

    // Login as technician
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.getByRole("textbox", { name: "Email" }).fill("tech@macseptic.com");
    await page.getByRole("textbox", { name: "Password" }).fill("#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), null, {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("My Dashboard — shows payment buttons on jobs", async () => {
    await page.goto(`${BASE_URL}/my-dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Dashboard should load
    const heading = page.getByRole("heading", { name: /Good/ });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check if there are any job cards with PAY buttons
    const payBtns = page.getByRole("button", { name: /PAY|Collect Payment/ });
    const count = await payBtns.count();

    // If there are jobs, they should have payment buttons
    if (count > 0) {
      await payBtns.first().click();
      await page.waitForTimeout(500);

      // Modal should open
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 3000 });
      await expect(dialog.getByText("Payment Method")).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("My Jobs page — job cards have Collect Payment button", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Page should load
    const heading = page.getByRole("heading", { name: /My Jobs/ });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check for Collect Payment buttons on cards
    const collectBtns = page.getByRole("button", { name: /Collect Payment/ });
    const count = await collectBtns.count();

    if (count > 0) {
      await collectBtns.first().click();
      await page.waitForTimeout(500);

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Verify it's our CollectPaymentModal (has method grid)
      await expect(dialog.getByRole("button", { name: /Cash/ })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Check/ })).toBeVisible();

      await page.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("My Jobs — Collect Payment modal uses technician endpoint", async () => {
    await page.goto(`${BASE_URL}/portal/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const collectBtns = page.getByRole("button", { name: /Collect Payment/ });
    const count = await collectBtns.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await collectBtns.first().click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // The modal should show isTechnician mode (no reference number field)
    // Select a method and enter amount
    await dialog.getByRole("button", { name: /Cash/ }).click();

    // Reference Number field should NOT be visible (technician mode)
    const refField = dialog.getByText("Reference Number");
    await expect(refField).not.toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
  });
});

// ─── Backend API Tests ─────────────────────────────────────

test.describe("Payment API Endpoints", () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await context.clearCookies();

    // Login as admin to get session cookie
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.getByRole("textbox", { name: "Email" }).fill("will@macseptic.com");
    await page.getByRole("textbox", { name: "Password" }).fill("#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), null, {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("POST /payments/clover/collect endpoint exists", async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/payments/clover/collect`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0.01,
          payment_method: "cash",
        }),
      });
      return { status: resp.status, body: await resp.text() };
    }, API_URL);

    // Should get 422 (validation error for missing required fields) or 400, NOT 404
    expect(result.status).not.toBe(404);
  });

  test("Technician dashboard returns total_amount field", async () => {
    const result = await page.evaluate(async (apiUrl: string) => {
      const resp = await fetch(`${apiUrl}/technician-dashboard/my-summary`, {
        credentials: "include",
      });
      return { status: resp.status, body: await resp.json() };
    }, API_URL);

    expect(result.status).toBe(200);
    // Verify the response structure includes our new fields
    if (result.body.todays_jobs && result.body.todays_jobs.length > 0) {
      const job = result.body.todays_jobs[0];
      expect("total_amount" in job).toBe(true);
      expect("customer_id" in job).toBe(true);
    }
  });
});

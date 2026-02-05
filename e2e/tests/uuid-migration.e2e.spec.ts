import { test, expect, Page } from "@playwright/test";

/**
 * UUID Standardization Migration E2E Tests
 *
 * Verifies all business entity IDs are UUID format after migration:
 * 1. /health returns 200
 * 2. Customers list returns UUID ids
 * 3. Work orders list returns UUID ids and customer_ids
 * 4. Invoices list returns UUID customer_ids matching customer.id format
 * 5. Payments list returns UUID ids
 * 6. Technicians list returns UUID ids
 * 7. All major list pages load without console errors
 * 8. Create workflow works end-to-end with UUID ids
 */

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Known console errors to ignore
const IGNORED_ERRORS = [
  "favicon",
  "net::ERR",
  "Sentry",
  "ResizeObserver",
  "API Schema Violation",
  "Failed to load resource",
  "the server responded with a status of",
  "WebSocket",
  "apple-touch-icon",
];

function isIgnoredError(text: string): boolean {
  return IGNORED_ERRORS.some((pattern) => text.includes(pattern));
}

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
        { timeout: 30000 },
      );
    } catch {
      // Retry login once
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
    }
    await page.waitForTimeout(1000);

    if (!page.url().includes(path)) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(2000);
  }
}

async function apiGet(page: Page, endpoint: string) {
  return page.evaluate(
    async ({ apiUrl, ep }) => {
      const res = await fetch(`${apiUrl}${ep}`, { credentials: "include" });
      return { status: res.status, ok: res.ok, body: await res.json() };
    },
    { apiUrl: API_URL, ep: endpoint },
  );
}

test.describe("UUID Standardization Migration", () => {
  test("API /health returns 200", async ({ page }) => {
    await loginAndNavigate(page, "/");

    const data = await page.evaluate(async (apiUrl) => {
      const res = await fetch(
        apiUrl.replace("/api/v2", "/health"),
        { credentials: "include" },
      );
      return { status: res.status, body: await res.json() };
    }, API_URL);

    console.log(`Health status: ${data.status}, body:`, JSON.stringify(data.body));
    expect(data.status).toBe(200);
    expect(data.body.status).toBe("healthy");
  });

  test("Customers API returns UUID ids", async ({ page }) => {
    await loginAndNavigate(page, "/customers");

    const data = await apiGet(page, "/customers/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const customer of items) {
      console.log(`Customer: id=${customer.id}, name=${customer.first_name} ${customer.last_name}`);
      expect(String(customer.id)).toMatch(UUID_REGEX);
    }
  });

  test("Work orders API returns UUID ids and customer_ids", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/schedule");

    const data = await apiGet(page, "/work-orders/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const wo of items) {
      console.log(
        `WorkOrder: id=${wo.id}, customer_id=${wo.customer_id}, status=${wo.status}`,
      );
      // Work order id should be UUID
      expect(String(wo.id)).toMatch(UUID_REGEX);
      // customer_id should be UUID (if present)
      if (wo.customer_id) {
        expect(String(wo.customer_id)).toMatch(UUID_REGEX);
      }
    }
  });

  test("Invoices API returns UUID customer_ids", async ({ page }) => {
    await loginAndNavigate(page, "/invoices");

    const data = await apiGet(page, "/invoices/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const inv of items) {
      console.log(
        `Invoice: id=${inv.id}, customer_id=${inv.customer_id}, number=${inv.invoice_number}`,
      );
      // Invoice id should be UUID
      expect(String(inv.id)).toMatch(UUID_REGEX);
      // customer_id should be UUID
      if (inv.customer_id) {
        expect(String(inv.customer_id)).toMatch(UUID_REGEX);
      }
    }
  });

  test("Payments API returns UUID ids", async ({ page }) => {
    await loginAndNavigate(page, "/payments");

    const data = await apiGet(page, "/payments/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const pmt of items) {
      console.log(
        `Payment: id=${pmt.id}, amount=${pmt.amount}, customer_name=${pmt.customer_name}`,
      );
      // Payment id should be UUID
      expect(String(pmt.id)).toMatch(UUID_REGEX);
      // amount should still be a number
      expect(typeof pmt.amount).toBe("number");
    }
  });

  test("Technicians API returns UUID ids", async ({ page }) => {
    await loginAndNavigate(page, "/technicians");

    const data = await apiGet(page, "/technicians/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const tech of items) {
      console.log(`Technician: id=${tech.id}, name=${tech.name}`);
      expect(String(tech.id)).toMatch(UUID_REGEX);
    }
  });

  test("Customer detail page loads with UUID id", async ({ page }) => {
    await loginAndNavigate(page, "/customers");

    // Get a customer ID from the API
    const data = await apiGet(page, "/customers/?page=1&page_size=1");
    const customerId = data.body.items?.[0]?.id;
    expect(customerId).toBeTruthy();
    expect(String(customerId)).toMatch(UUID_REGEX);

    // Navigate to customer detail
    const detailData = await apiGet(page, `/customers/${customerId}`);
    expect(detailData.ok).toBeTruthy();
    expect(String(detailData.body.id)).toMatch(UUID_REGEX);
    console.log(
      `Customer detail: id=${detailData.body.id}, name=${detailData.body.first_name} ${detailData.body.last_name}`,
    );
  });

  test("Invoice-Customer relationship uses matching UUID", async ({
    page,
  }) => {
    await loginAndNavigate(page, "/invoices");

    // Get an invoice with a customer_id
    const invoiceData = await apiGet(page, "/invoices/?page=1&page_size=10");
    const invoiceWithCustomer = (invoiceData.body.items || []).find(
      (inv: { customer_id?: string }) => inv.customer_id,
    );

    if (!invoiceWithCustomer) {
      console.log("No invoices with customer_id found, skipping");
      return;
    }

    const customerId = invoiceWithCustomer.customer_id;
    console.log(`Invoice ${invoiceWithCustomer.id} has customer_id ${customerId}`);

    // Verify the customer exists with that UUID
    const customerData = await apiGet(page, `/customers/${customerId}`);
    expect(customerData.ok).toBeTruthy();
    expect(String(customerData.body.id)).toBe(String(customerId));
    console.log(
      `Verified: Invoice customer_id ${customerId} matches Customer ${customerData.body.first_name} ${customerData.body.last_name}`,
    );
  });

  test("Customers page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/customers");
    await page.waitForTimeout(5000);

    // Table should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    if (errors.length > 0) {
      console.log("Console errors:", errors.join("\n"));
    }
    expect(errors).toHaveLength(0);
  });

  test("Work orders page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/schedule");
    await page.waitForTimeout(5000);

    if (errors.length > 0) {
      console.log("Console errors:", errors.join("\n"));
    }
    expect(errors).toHaveLength(0);
  });

  test("Invoices page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/invoices");
    await page.waitForTimeout(5000);

    // Table should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    if (errors.length > 0) {
      console.log("Console errors:", errors.join("\n"));
    }
    expect(errors).toHaveLength(0);
  });

  test("Payments page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await loginAndNavigate(page, "/payments");
    await page.waitForTimeout(5000);

    // Table should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    if (errors.length > 0) {
      console.log("Console errors:", errors.join("\n"));
    }
    expect(errors).toHaveLength(0);
  });

  test("No integer IDs leak through any list endpoint", async ({ page }) => {
    await loginAndNavigate(page, "/");

    // Check multiple endpoints for integer ID leakage
    const endpoints = [
      { path: "/customers/?page=1&page_size=3", idField: "id", name: "customers" },
      { path: "/work-orders/?page=1&page_size=3", idField: "id", name: "work-orders" },
      { path: "/invoices/?page=1&page_size=3", idField: "id", name: "invoices" },
      { path: "/payments/?page=1&page_size=3", idField: "id", name: "payments" },
      { path: "/technicians/?page=1&page_size=3", idField: "id", name: "technicians" },
    ];

    for (const ep of endpoints) {
      const data = await apiGet(page, ep.path);
      if (!data.ok) {
        console.log(`${ep.name}: HTTP ${data.status}, skipping`);
        continue;
      }

      const items = data.body.items || data.body;
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`${ep.name}: no items, skipping`);
        continue;
      }

      const first = items[0];
      const id = String(first[ep.idField]);

      // ID must NOT be a plain integer
      const isInteger = /^\d+$/.test(id);
      console.log(`${ep.name}: ${ep.idField}=${id}, isInteger=${isInteger}`);
      expect(isInteger).toBe(false);

      // ID must be UUID format
      expect(id).toMatch(UUID_REGEX);
    }
  });
});

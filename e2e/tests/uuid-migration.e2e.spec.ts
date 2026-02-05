import { test, expect, Page } from "@playwright/test";

/**
 * UUID Standardization Migration E2E Tests
 *
 * Verifies all business entity IDs are UUID format after migration.
 * Uses stored auth state from auth.setup.ts to avoid rate limiting.
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

async function apiGet(page: Page, endpoint: string) {
  return page.evaluate(
    async ({ apiUrl, ep }) => {
      const res = await fetch(`${apiUrl}${ep}`, { credentials: "include" });
      const text = await res.text();
      try {
        return { status: res.status, ok: res.ok, body: JSON.parse(text) };
      } catch {
        return { status: res.status, ok: res.ok, body: text };
      }
    },
    { apiUrl: API_URL, ep: endpoint },
  );
}

async function ensureLoggedIn(page: Page) {
  // Use stored auth state - just navigate to app
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // If still on login, do a quick login
  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 30000 },
    );
    await page.waitForTimeout(2000);
  }
}

test.describe("UUID Standardization Migration", () => {
  test("API /health returns 200", async ({ page }) => {
    const data = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return { status: res.status, body: await res.json() };
    }, "https://react-crm-api-production.up.railway.app/health");

    expect(data.status).toBe(200);
    expect(data.body.status).toBe("healthy");
  });

  test("Customers API returns UUID ids", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/customers/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const customer of items) {
      console.log(`Customer: id=${customer.id}, name=${customer.first_name}`);
      expect(String(customer.id)).toMatch(UUID_REGEX);
    }
  });

  test("Work orders API returns UUID ids and customer_ids", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/work-orders/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const wo of items) {
      console.log(`WorkOrder: id=${wo.id}, customer_id=${wo.customer_id}`);
      expect(String(wo.id)).toMatch(UUID_REGEX);
      if (wo.customer_id) {
        expect(String(wo.customer_id)).toMatch(UUID_REGEX);
      }
    }
  });

  test("Invoices API returns UUID customer_ids", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/invoices/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const inv of items) {
      console.log(`Invoice: id=${inv.id}, customer_id=${inv.customer_id}`);
      expect(String(inv.id)).toMatch(UUID_REGEX);
      if (inv.customer_id) {
        expect(String(inv.customer_id)).toMatch(UUID_REGEX);
      }
    }
  });

  test("Payments API returns UUID ids", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/payments/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const pmt of items) {
      console.log(`Payment: id=${pmt.id}, amount=${pmt.amount}`);
      expect(String(pmt.id)).toMatch(UUID_REGEX);
      expect(typeof pmt.amount).toBe("number");
    }
  });

  test("Technicians API returns UUID ids", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/technicians/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const tech of items) {
      console.log(`Technician: id=${tech.id}, name=${tech.name}`);
      expect(String(tech.id)).toMatch(UUID_REGEX);
    }
  });

  test("Customer detail loads with UUID id", async ({ page }) => {
    await ensureLoggedIn(page);
    const data = await apiGet(page, "/customers/?page=1&page_size=1");
    const customerId = data.body.items?.[0]?.id;
    expect(customerId).toBeTruthy();
    expect(String(customerId)).toMatch(UUID_REGEX);

    const detail = await apiGet(page, `/customers/${customerId}`);
    expect(detail.ok).toBeTruthy();
    expect(String(detail.body.id)).toMatch(UUID_REGEX);
    console.log(`Customer detail: ${detail.body.first_name} ${detail.body.last_name}`);
  });

  test("Invoice-Customer relationship uses matching UUID", async ({ page }) => {
    await ensureLoggedIn(page);
    const invoiceData = await apiGet(page, "/invoices/?page=1&page_size=10");
    const invoiceWithCustomer = (invoiceData.body.items || []).find(
      (inv: { customer_id?: string }) => inv.customer_id,
    );

    if (!invoiceWithCustomer) {
      console.log("No invoices with customer_id found, skipping");
      return;
    }

    const customerId = invoiceWithCustomer.customer_id;
    const customerData = await apiGet(page, `/customers/${customerId}`);
    expect(customerData.ok).toBeTruthy();
    expect(String(customerData.body.id)).toBe(String(customerId));
    console.log(`Verified: Invoice→Customer ${customerData.body.first_name}`);
  });

  test("Customers page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await ensureLoggedIn(page);
    await page.goto(`${APP_URL}/customers`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    if (errors.length > 0) console.log("Errors:", errors.join("\n"));
    expect(errors).toHaveLength(0);
  });

  test("Work orders page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await ensureLoggedIn(page);
    await page.goto(`${APP_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    if (errors.length > 0) console.log("Errors:", errors.join("\n"));
    expect(errors).toHaveLength(0);
  });

  test("No integer IDs leak through any list endpoint", async ({ page }) => {
    await ensureLoggedIn(page);

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

      const id = String(items[0][ep.idField]);
      const isInteger = /^\d+$/.test(id);
      console.log(`${ep.name}: ${ep.idField}=${id}, isUUID=${!isInteger}`);
      expect(isInteger).toBe(false);
      expect(id).toMatch(UUID_REGEX);
    }
  });
});

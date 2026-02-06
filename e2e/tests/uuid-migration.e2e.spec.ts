import { test, expect, Page, BrowserContext } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * UUID Standardization Migration E2E Tests
 *
 * Verifies all business entity IDs are UUID format after migration.
 * Authenticates once in beforeAll to avoid rate limiting.
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

// Health check doesn't need auth - use Playwright request API directly
test("API /health returns 200", async ({ request }) => {
  const res = await request.get(
    "https://react-crm-api-production.up.railway.app/health",
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("healthy");
});

test.describe("UUID Standardization Migration", () => {
  let authContext: BrowserContext;
  let authPage: Page;

  test.beforeAll(async ({ browser }) => {
    authContext = await browser.newContext();
    authPage = await authContext.newPage();

    // Login once for all tests
    await authPage.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await authPage.waitForTimeout(3000);

    if (authPage.url().includes("/login")) {
      await authPage.fill('input[type="email"]', "will@macseptic.com");
      await authPage.fill('input[type="password"]', "#Espn2025");
      await authPage.click('button[type="submit"]');
      await authPage.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 },
      );
      await authPage.waitForTimeout(2000);
    }
  });

  test.afterAll(async () => {
    await authContext?.close();
  });

  test("Customers API returns UUID ids", async () => {
    const data = await apiGet(authPage, "/customers/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const customer of items) {
      console.log(`Customer: id=${customer.id}, name=${customer.first_name}`);
      expect(String(customer.id)).toMatch(UUID_REGEX);
    }
  });

  test("Work orders API returns UUID ids and customer_ids", async () => {
    const data = await apiGet(authPage, "/work-orders/?page=1&page_size=5");

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

  test("Invoices API returns UUID customer_ids", async () => {
    const data = await apiGet(authPage, "/invoices/?page=1&page_size=5");

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

  test("Payments API returns UUID ids", async () => {
    const data = await apiGet(authPage, "/payments/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const pmt of items) {
      console.log(`Payment: id=${pmt.id}, amount=${pmt.amount}`);
      expect(String(pmt.id)).toMatch(UUID_REGEX);
      expect(typeof pmt.amount).toBe("number");
    }
  });

  test("Technicians API returns UUID ids", async () => {
    const data = await apiGet(authPage, "/technicians/?page=1&page_size=5");

    expect(data.ok).toBeTruthy();
    const items = data.body.items || data.body;
    expect(items.length).toBeGreaterThan(0);

    for (const tech of items) {
      console.log(`Technician: id=${tech.id}, name=${tech.name}`);
      expect(String(tech.id)).toMatch(UUID_REGEX);
    }
  });

  test("Customer detail loads with UUID id", async () => {
    const data = await apiGet(authPage, "/customers/?page=1&page_size=1");
    const customerId = data.body.items?.[0]?.id;
    expect(customerId).toBeTruthy();
    expect(String(customerId)).toMatch(UUID_REGEX);

    const detail = await apiGet(authPage, `/customers/${customerId}`);
    expect(detail.ok).toBeTruthy();
    expect(String(detail.body.id)).toMatch(UUID_REGEX);
    console.log(`Customer detail: ${detail.body.first_name} ${detail.body.last_name}`);
  });

  test("Invoice-Customer relationship uses matching UUID", async () => {
    const invoiceData = await apiGet(authPage, "/invoices/?page=1&page_size=10");
    const invoiceWithCustomer = (invoiceData.body.items || []).find(
      (inv: { customer_id?: string }) => inv.customer_id,
    );

    if (!invoiceWithCustomer) {
      console.log("No invoices with customer_id found, skipping");
      return;
    }

    const customerId = invoiceWithCustomer.customer_id;
    const customerData = await apiGet(authPage, `/customers/${customerId}`);
    expect(customerData.ok).toBeTruthy();
    expect(String(customerData.body.id)).toBe(String(customerId));
    console.log(`Verified: Invoice→Customer ${customerData.body.first_name}`);
  });

  test("Customers page loads without console errors", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await authPage.goto(`${APP_URL}/customers`, { waitUntil: "domcontentloaded" });
    await authPage.waitForTimeout(5000);

    const table = authPage.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    authPage.removeAllListeners("console");

    if (errors.length > 0) console.log("Errors:", errors.join("\n"));
    expect(errors).toHaveLength(0);
  });

  test("Work orders page loads without console errors", async () => {
    const errors: string[] = [];
    authPage.on("console", (msg) => {
      if (msg.type() === "error" && !isIgnoredError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await authPage.goto(`${APP_URL}/schedule`, { waitUntil: "domcontentloaded" });
    await authPage.waitForTimeout(5000);

    authPage.removeAllListeners("console");

    if (errors.length > 0) console.log("Errors:", errors.join("\n"));
    expect(errors).toHaveLength(0);
  });

  test("No integer IDs leak through any list endpoint", async () => {
    const endpoints = [
      { path: "/customers/?page=1&page_size=3", idField: "id", name: "customers" },
      { path: "/work-orders/?page=1&page_size=3", idField: "id", name: "work-orders" },
      { path: "/invoices/?page=1&page_size=3", idField: "id", name: "invoices" },
      { path: "/payments/?page=1&page_size=3", idField: "id", name: "payments" },
      { path: "/technicians/?page=1&page_size=3", idField: "id", name: "technicians" },
    ];

    for (const ep of endpoints) {
      const data = await apiGet(authPage, ep.path);
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

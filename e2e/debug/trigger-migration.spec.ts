import { test, expect } from "@playwright/test";

const API_URL = "https://react-crm-api-production.up.railway.app";

test("Check current alembic version and trigger migration", async ({ page }) => {
  // First, login to the CRM to get a session
  await page.goto("https://react.ecbtx.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 30000 },
    );
    await page.waitForTimeout(1000);
  }

  // Check health first
  const health = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/health`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API_URL);
  console.log("Health:", JSON.stringify(health.body));

  // Check if customers are still returning integer IDs
  const customers = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/customers/?page=1&page_size=2`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API_URL);
  console.log("Customers status:", customers.status);
  if (customers.status === 200) {
    const items = customers.body.items || customers.body;
    if (items.length > 0) {
      console.log("First customer id:", items[0].id, "type:", typeof items[0].id);
      console.log("Is UUID?", /^[0-9a-f]{8}-/.test(String(items[0].id)));
    }
  } else {
    console.log("Customers response:", JSON.stringify(customers.body).substring(0, 500));
  }

  // Try triggering migration endpoint
  console.log("\nAttempting to trigger /health/db/migrate...");
  const migrate = await page.evaluate(async (apiUrl) => {
    try {
      const res = await fetch(`${apiUrl}/health/db/migrate`, {
        method: "POST",
        credentials: "include",
      });
      const text = await res.text();
      return { status: res.status, body: text.substring(0, 2000) };
    } catch (e) {
      return { error: String(e) };
    }
  }, API_URL);
  console.log("Migration result:", JSON.stringify(migrate));

  // Also check the general health/db endpoint
  const dbHealth = await page.evaluate(async (apiUrl) => {
    try {
      const res = await fetch(`${apiUrl}/health/db`, { credentials: "include" });
      const text = await res.text();
      return { status: res.status, body: text.substring(0, 2000) };
    } catch (e) {
      return { error: String(e) };
    }
  }, API_URL);
  console.log("DB health:", JSON.stringify(dbHealth));

  // Check work orders (these should already be UUID if old code)
  const workOrders = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/work-orders/?page=1&page_size=2`, { credentials: "include" });
    return { status: res.status, body: await res.json() };
  }, API_URL);
  console.log("Work orders status:", workOrders.status);
  if (workOrders.status === 200) {
    const items = workOrders.body.items || workOrders.body;
    if (items.length > 0) {
      console.log("First WO id:", items[0].id, "customer_id:", items[0].customer_id);
    }
  } else {
    console.log("Work orders response:", JSON.stringify(workOrders.body).substring(0, 500));
  }
});

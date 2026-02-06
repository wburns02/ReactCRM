import { test } from "@playwright/test";

const API_URL = "https://react-crm-api-production.up.railway.app";

test("Quick API state check", async ({ page }) => {
  await page.goto("https://react.ecbtx.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 30000 });
    await page.waitForTimeout(1000);
  }

  // Check customers
  const customers = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/customers/?page=1&page_size=1`, { credentials: "include" });
    const body = await res.json();
    return { status: res.status, id: body.items?.[0]?.id, type: typeof body.items?.[0]?.id };
  }, API_URL);
  console.log("Customers:", customers.status, "id:", customers.id, "type:", customers.type);

  // Check work orders
  const wo = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/work-orders/?page=1&page_size=1`, { credentials: "include" });
    return { status: res.status, body: (await res.text()).substring(0, 300) };
  }, API_URL);
  console.log("Work orders:", wo.status, wo.body);

  // Check alembic version via raw query attempt
  const dbInfo = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/health/db`, { credentials: "include" });
    return { status: res.status, body: (await res.text()).substring(0, 500) };
  }, API_URL);
  console.log("DB health:", dbInfo.body);
});

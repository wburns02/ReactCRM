import { test, expect } from "@playwright/test";

const API_URL = "https://react-crm-api-production.up.railway.app";

test("Trigger UUID migration via /health/db/migrate-uuid", async ({ page }) => {
  test.setTimeout(120000); // 2 min timeout for migration

  // Navigate to app to get session cookie
  await page.goto("https://react.ecbtx.com/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Step 1: Pre-migration check
  console.log("=== PRE-MIGRATION CHECK ===");
  const preCust = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/customers/?page=1&page_size=1`, { credentials: "include" });
    if (!res.ok) return { status: res.status, error: await res.text() };
    const body = await res.json();
    return { status: res.status, id: body.items?.[0]?.id, type: typeof body.items?.[0]?.id };
  }, API_URL);
  console.log("Pre-migration customers:", JSON.stringify(preCust));

  // Step 2: Trigger the UUID migration (long timeout - may take 30+ seconds)
  console.log("\n=== TRIGGERING UUID MIGRATION ===");
  const migrateResult = await page.evaluate(async (apiUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 90s
      const res = await fetch(`${apiUrl}/health/db/migrate-uuid`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      return { status: res.status, body: text };
    } catch (e) {
      return { error: String(e) };
    }
  }, API_URL);
  console.log("Migration status:", migrateResult.status);
  console.log("Migration result:", migrateResult.body?.substring(0, 2000));

  // Step 3: Check result
  if (migrateResult.status === 404) {
    console.log("ERROR: /health/db/migrate-uuid endpoint not found - old code still deployed!");
    return;
  }

  // Step 4: Verify customers now have UUID IDs
  console.log("\n=== POST-MIGRATION CHECK ===");
  const postCust = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/customers/?page=1&page_size=2`, { credentials: "include" });
    if (!res.ok) return { status: res.status, error: (await res.text()).substring(0, 500) };
    const body = await res.json();
    return { status: res.status, items: (body.items || []).map((c: any) => ({ id: c.id, name: c.first_name })) };
  }, API_URL);
  console.log("Post-migration customers:", JSON.stringify(postCust));

  const postWO = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/work-orders/?page=1&page_size=2`, { credentials: "include" });
    return { status: res.status, body: (await res.text()).substring(0, 500) };
  }, API_URL);
  console.log("Post-migration work orders:", postWO.status, postWO.body?.substring(0, 300));

  const postPay = await page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/v2/payments/?page=1&page_size=2`, { credentials: "include" });
    return { status: res.status, body: (await res.text()).substring(0, 500) };
  }, API_URL);
  console.log("Post-migration payments:", postPay.status, postPay.body?.substring(0, 300));
});

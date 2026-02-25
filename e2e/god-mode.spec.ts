import { test, expect } from "@playwright/test";

const BASE = "https://react.ecbtx.com";
const API = "https://react-crm-api-production.up.railway.app/api/v2";

async function apiLogin(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "will@macseptic.com");
  await page.fill('input[name="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 15000 });
  await page.waitForTimeout(2000);
}

test("API: ops-center live-state returns valid data", async ({ page }) => {
  await apiLogin(page);
  const resp = await page.evaluate(async (url) => {
    const r = await fetch(`${url}/ops-center/live-state`, { credentials: "include" });
    return { status: r.status, body: await r.json() };
  }, API);

  expect(resp.status).toBe(200);
  expect(resp.body).toHaveProperty("technicians");
  expect(resp.body).toHaveProperty("jobs");
  expect(resp.body).toHaveProperty("alerts");
  expect(resp.body).toHaveProperty("stats");
  expect(resp.body).toHaveProperty("timestamp");
  expect(Array.isArray(resp.body.technicians)).toBe(true);
  expect(Array.isArray(resp.body.jobs)).toBe(true);
  expect(resp.body.stats).toHaveProperty("total_jobs");
  expect(resp.body.stats).toHaveProperty("on_duty_techs");
});

test("UI: God Mode page loads with all sections", async ({ page }) => {
  await apiLogin(page);
  await page.goto(`${BASE}/god-mode`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Check page title
  await expect(page.getByRole("heading", { name: "Operations Center" })).toBeVisible({ timeout: 10000 });

  // Check KPI strip — uses short labels like "Jobs", "Done", "Active", "Techs On"
  await expect(page.getByText("Jobs", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Techs On", { exact: true })).toBeVisible();

  // Check technician section
  await expect(page.getByRole("heading", { name: /Technicians/ })).toBeVisible();

  // Check filter buttons
  await expect(page.getByRole("button", { name: /all/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /unassigned/i })).toBeVisible();
});

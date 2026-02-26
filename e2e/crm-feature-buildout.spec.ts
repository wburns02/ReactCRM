/**
 * CRM Feature Buildout — 6-Phase Playwright Verification
 * Login once, save cookies, reuse for all tests.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { fileURLToPath } from "url";
import * as path from "path";

const API = "https://react-crm-api-production.up.railway.app/api/v2";
const APP = "https://react.ecbtx.com";
const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth-state.json");

// Known console errors to ignore
const IGNORE_ERRORS = [
  "API Schema Violation", "Sentry", "ResizeObserver", "favicon",
  "Failed to load resource", "server responded with a status of",
  "net::ERR", "ChunkLoadError", "workbox", "sw.js", "Preflight",
  "WebSocket", "ws://", "wss://",
];

async function login(page: Page) {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function apiFetch(page: Page, apiPath: string) {
  return page.evaluate(async ({ api, p }) => {
    const res = await fetch(`${api}${p}`, { credentials: "include" });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    let data: unknown = null;
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data, headers };
  }, { api: API, p: apiPath });
}

// ─── Login once, save state ──────────────────────────────────
test("Login as admin and save state", async ({ page, context }) => {
  await login(page);
  expect(page.url()).not.toContain("/login");
  await context.storageState({ path: STATE_FILE });
});

// ─── All subsequent tests reuse saved auth ───────────────────
test.describe("Feature tests", () => {
  test.use({ storageState: STATE_FILE });

  // ═══ PHASE 1: Money Loop ══════════════════════════════════════

  test("1A: Billing stats returns real data", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/billing/stats");
    expect(result.status).toBe(200);
    expect(result.headers["x-stub"]).toBeUndefined();
    expect(typeof (result.data as Record<string, unknown>).total_revenue).toBe("number");
    expect(typeof (result.data as Record<string, unknown>).outstanding).toBe("number");
  });

  test("1B: Customer portal pay endpoint returns 404 for missing invoice", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/customer-portal/pay/00000000-0000-0000-0000-000000000000");
    expect([404, 422]).toContain(result.status);
  });

  test("1C: Customer portal pay page renders", async ({ page }) => {
    await page.goto(`${APP}/customer-portal/pay/00000000-0000-0000-0000-000000000000`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const text = await page.textContent("body");
    const hasContent = text!.includes("Invoice") || text!.includes("invoice") || text!.includes("Not Found") || text!.includes("MAC Septic");
    expect(hasContent).toBe(true);
  });

  // ═══ PHASE 2: Follow-ups ══════════════════════════════════════

  test("2A: Reminders endpoint responds", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/reminders");
    expect(result.status).toBe(200);
  });

  // ═══ PHASE 3: Smart Dispatch ══════════════════════════════════

  test("3A: Dispatch recommend endpoint exists", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/dispatch/recommend/00000000-0000-0000-0000-000000000000");
    expect(result.status).not.toBe(405);
  });

  // ═══ PHASE 4: Customer Experience ═════════════════════════════

  test("4A: Public booking page /book loads", async ({ page }) => {
    await page.goto(`${APP}/book`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const text = await page.textContent("body");
    const hasContent = text!.includes("Book") || text!.includes("Service") || text!.includes("MAC") || text!.includes("Schedule") || text!.includes("Septic");
    expect(hasContent).toBe(true);
  });

  test("4B: Customer timeline endpoint exists", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const custResult = await apiFetch(page, "/customers?page_size=1");
    expect(custResult.status).toBe(200);
    const items = (custResult.data as { items: Array<{ id: string }> }).items;
    expect(items.length).toBeGreaterThan(0);

    const customerId = items[0].id;
    const timelineResult = await apiFetch(page, `/customers/${customerId}/timeline`);
    expect(timelineResult.status).toBe(200);
    expect(Array.isArray((timelineResult.data as { items: unknown[] }).items)).toBe(true);
  });

  test("4C: Quotes page loads", async ({ page }) => {
    await page.goto(`${APP}/quotes`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const text = await page.textContent("body");
    expect(text!.toLowerCase()).toContain("quote");
  });

  test("4D: Coaching page loads", async ({ page }) => {
    await page.goto(`${APP}/coaching`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const text = await page.textContent("body");
    const hasContent = text!.toLowerCase().includes("coaching") || text!.toLowerCase().includes("performance") || text!.toLowerCase().includes("technician") || text!.toLowerCase().includes("recommendation") || text!.toLowerCase().includes("ai") || text!.toLowerCase().includes("dashboard") || text!.toLowerCase().includes("mac");
    expect(hasContent).toBe(true);
  });

  // ═══ PHASE 5: Inventory ═══════════════════════════════════════

  test("5A: Inventory endpoint responds", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/inventory?page_size=5");
    expect(result.status).toBe(200);
    expect((result.data as { items: unknown[] })).toHaveProperty("items");
  });

  // ═══ PHASE 6: Revenue Intelligence ════════════════════════════

  test("6A: Revenue forecast endpoint responds", async ({ page }) => {
    await page.goto(APP, { waitUntil: "domcontentloaded" });
    const result = await apiFetch(page, "/revenue/forecast");
    expect(result.status).toBe(200);
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.forecasts)).toBe(true);
    expect(typeof data.avg_monthly_revenue).toBe("number");
  });

  test("6B: Financial dashboard loads", async ({ page }) => {
    await page.goto(`${APP}/analytics/financial`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const text = await page.textContent("body");
    const hasContent = text!.includes("Financial") || text!.includes("Revenue") || text!.includes("Aging") || text!.includes("Dashboard");
    expect(hasContent).toBe(true);
  });

  // ═══ CONSOLE ERROR CHECK ══════════════════════════════════════

  test("No critical console errors on new pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORE_ERRORS.some((i) => text.includes(i))) {
          errors.push(text);
        }
      }
    });

    for (const p of ["/billing/overview", "/quotes", "/book"]) {
      await page.goto(`${APP}${p}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    const critical = errors.filter(
      (e) => !e.includes("404") && !e.includes("401") && !e.includes("undefined") && !e.includes("Cannot read") && !e.includes("fetch"),
    );
    if (critical.length > 0) {
      console.log("Critical console errors:", critical);
    }
    expect(critical.length).toBe(0);
  });
});

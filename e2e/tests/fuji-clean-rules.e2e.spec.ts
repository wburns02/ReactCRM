/**
 * Fuji Clean Manufacturer-Specific Inspection Rules E2E Tests
 *
 * Verifies aerobic inspection rules for Fuji Clean on production (summary view):
 * - Fuji Clean system identification in Service Notes
 * - Fiberglass collapse warning
 * - $745 Fuji pumping price in estimate
 * - Air filter $10 note
 * - Refill requirement note
 *
 * Uses WO-001140 (aerobic Fuji Clean, completed inspection with recommend_pumping=true)
 * WO ID: 69611fb7-7b25-4f81-933e-1ffb176fadbd
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const FUJI_WO_ID = "69611fb7-7b25-4f81-933e-1ffb176fadbd";

const KNOWN_ERRORS = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "ERR_BLOCKED_BY_CLIENT",
  "net::ERR",
];

function isKnownError(msg: string): boolean {
  return KNOWN_ERRORS.some((known) => msg.includes(known));
}

test.describe.serial("Fuji Clean Manufacturer-Specific Inspection Rules", () => {
  let ctx: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Fresh context — no stored auth from test@macseptic.com
    ctx = await browser.newContext({ storageState: undefined });
    page = await ctx.newPage();

    // Login as admin (will@macseptic.com)
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 15000 });
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");
  }, { timeout: 60000 });

  test.afterAll(async () => {
    await ctx?.close();
  });

  test("WO-001140 loads as aerobic system", async () => {
    await page.goto(`${BASE_URL}/portal/jobs/${FUJI_WO_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Aerobic System")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("#WO-001140")).toBeVisible();
  });

  test("Inspect tab shows Fuji Clean service notes", async () => {
    await page.getByRole("button", { name: /Inspect/i }).click();
    // Wait for inspection summary to load (completed inspection)
    await expect(page.getByText(/Fuji Clean/i).first()).toBeVisible({ timeout: 12000 });
  });

  test("Fiberglass collapse warning is shown", async () => {
    // autoNotes: "⚠️ If pumping: MUST refill tank immediately — fiberglass tanks collapse without water weight."
    // warnings: "⚠️ FIBERGLASS TANK — MUST refill immediately after pumping or tank will collapse!"
    await expect(
      page.getByText(/fiberglass|collapse/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("MUST refill requirement is shown", async () => {
    await expect(
      page.getByText(/MUST refill|must refill|refill.*immediately|immediately.*refill/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("$745 Fuji pumping price is shown in estimate", async () => {
    // Fuji pumping: $595 + $150 = $745 (shown when recommend_pumping=true)
    await expect(page.getByText(/\$745/).first()).toBeVisible({ timeout: 5000 });
  });

  test("Air filter $10 note is shown", async () => {
    // autoNotes: "Check and replace air filter ($10, annual replacement)."
    await expect(page.getByText(/air filter/i).first()).toBeVisible();
    await expect(page.getByText(/\$10/).first()).toBeVisible();
  });

  test("Recommend pumping is shown in summary", async () => {
    // Since recommend_pumping=true, the pumping section should appear
    await expect(page.getByText(/pump|pumping/i).first()).toBeVisible();
  });

  test("No unexpected console errors on Fuji inspection page", async () => {
    const errors: string[] = [];
    const listener = (msg: import("@playwright/test").ConsoleMessage) => {
      if (msg.type() === "error" && !isKnownError(msg.text())) {
        errors.push(msg.text());
      }
    };
    page.on("console", listener);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Inspect/i }).click();
    await page.waitForTimeout(2000);
    page.off("console", listener);
    expect(errors, `Unexpected console errors: ${errors.join("\n")}`).toHaveLength(0);
  });
});

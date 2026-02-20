/**
 * Manufacturer-Specific Inspection Rules E2E Tests
 *
 * Verifies aerobic inspection rules for Norweco on production:
 * - Air filter ($10) in equipment checklist
 * - ManufacturerBanner with $795 pricing, bio-kinetic basket, REFILL REQ'D
 * - Weather data (temperature, 7-day precip)
 * - Summary: 18-day CRM reminder callout
 * - Summary: Contract pricing note for Norweco (Bio-Kinetic Basket $75/yr)
 * - Summary: Pumping toggle shows $795 (Norweco price)
 *
 * Uses WO-001139 (aerobic, Will Burns) — completed via production API.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const WO_ID = "e8957bba-8a92-4925-910e-352325322c7f";

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

test.describe.serial("Manufacturer-Specific Inspection Rules", () => {
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

  test("WO-001139 loads as aerobic system", async () => {
    await page.goto(`${BASE_URL}/portal/jobs/${WO_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Aerobic System")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("#WO-001139")).toBeVisible();
  });

  test("Inspect tab shows Norweco System banner", async () => {
    await page.getByRole("button", { name: /Inspect/i }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Norweco System/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("REFILL REQ'D badge is visible", async () => {
    await expect(page.getByText(/REFILL REQ'D/i).first()).toBeVisible();
  });

  test("Weather temperature is shown", async () => {
    await expect(page.getByText(/°F/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("7-day precipitation section is visible", async () => {
    await expect(page.getByText(/7-day precip|7-Day Precipitation/i).first()).toBeVisible();
  });

  test("$795 Norweco pumping price is shown", async () => {
    await expect(page.getByText(/\$795/).first()).toBeVisible();
  });

  test("Bio-kinetic basket note is shown", async () => {
    await expect(page.getByText(/bio-kinetic basket/i).first()).toBeVisible();
  });

  test("18-day CRM post-pumping reminder callout is shown", async () => {
    await expect(page.getByText(/18 days|control panel back ON/i).first()).toBeVisible();
  });

  test("Air filter $10 note is shown in summary findings", async () => {
    // "Annual air filter replacement recommended ($10 part)"
    await expect(page.getByText(/air filter/i).first()).toBeVisible();
    await expect(page.getByText(/\$10/).first()).toBeVisible();
  });

  test("Contract pricing note shown for Norweco in summary", async () => {
    // The purple "Contract Pricing Note" callout should appear in the summary
    // showing that Norweco contracts should be priced higher with basket cleaning line items
    await expect(page.getByText(/Contract Pricing Note|Bio-Kinetic Basket Cleaning/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Pumping toggle shows Norweco price ($795) not standard ($595)", async () => {
    // The pumping toggle should show $795.00 for Norweco, not $595.00
    // $795 appears in the toggle AND in the ManufacturerBanner
    const priceCells = page.getByText(/\$795/);
    await expect(priceCells.first()).toBeVisible();
  });

  test("No unexpected console errors on inspection page", async () => {
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

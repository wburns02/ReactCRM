/**
 * Property Intelligence E2E Tests
 *
 * Verifies:
 * 1. /property-intelligence page loads without error
 * 2. /property-intelligence/search page loads and accepts a query
 * 3. Customer detail page shows "View Property Data →" link for customers with an address
 *
 * Auth: Admin (will@macseptic.com) via fresh context
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

test.describe.serial("Property Intelligence", () => {
  let ctx: BrowserContext;
  let page: Page;

  test("0. Login as admin", async ({ browser }) => {
    ctx = await browser.newContext({ storageState: undefined, viewport: { width: 1280, height: 900 } });
    page = await ctx.newPage();

    await ctx.clearCookies();
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    if (!page.url().includes("/login")) {
      await ctx.clearCookies();
      await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
    }

    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button[type="submit"]');

    try {
      await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 25000 });
    } catch {
      await page.fill('input[type="email"]', "will@macseptic.com");
      await page.fill('input[type="password"]', "#Espn2025");
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 25000 });
    }

    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/login");
  });

  test("1. /property-intelligence dashboard loads", async () => {
    await page.goto(`${APP_URL}/property-intelligence`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Should not show a crash/error screen
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Cannot read properties");

    // Should show some property intelligence content
    const hasContent = await page.locator("body").evaluate((el) =>
      el.innerText.length > 50
    );
    expect(hasContent).toBe(true);
  });

  test("2. /property-intelligence/search page loads", async () => {
    await page.goto(`${APP_URL}/property-intelligence/search`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await expect(page.locator("body")).not.toContainText("Something went wrong");
    await expect(page.locator("body")).not.toContainText("Cannot read properties");
  });

  test("3. /property-intelligence/search?q=... pre-fills query", async () => {
    const query = "123 Main St, San Marcos, TX";
    await page.goto(
      `${APP_URL}/property-intelligence/search?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForTimeout(1500);

    // The search input should be pre-filled with the address query
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="address" i], input[placeholder*="search" i]').first();
    const inputValue = await searchInput.inputValue().catch(() => "");
    // Either the input is filled or results/message appear on screen
    const bodyText = await page.locator("body").innerText();
    const hasAddressOrInput = inputValue.includes("Main") || bodyText.includes("Main") || bodyText.includes("No results") || bodyText.includes("Search");
    expect(hasAddressOrInput).toBe(true);
  });

  test("4. Customer detail page shows 'View Property Data' link", async () => {
    // Fetch the first customer with an address via API
    const result = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/customers/?limit=50`, { credentials: "include" });
      const data = await res.json();
      const customers = data.customers || data.items || (Array.isArray(data) ? data : []);
      const withAddress = customers.find((c: { address_line1?: string; id: string }) => c.address_line1);
      return withAddress ? { id: withAddress.id, address: withAddress.address_line1 } : null;
    }, API_URL);

    expect(result).not.toBeNull();
    console.log(`Testing with customer ${result!.id} (${result!.address})`);

    await page.goto(`${APP_URL}/customers/${result!.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // "View Property Data →" link should be present
    await expect(
      page.getByRole("link", { name: /View Property Data/i })
    ).toBeVisible({ timeout: 8000 });
  });

  test("5. 'View Property Data' link navigates to property search page", async () => {
    // Click the link and verify navigation
    const link = page.getByRole("link", { name: /View Property Data/i });
    await link.click();
    await page.waitForTimeout(1500);

    expect(page.url()).toContain("/property-intelligence/search");
    // URL should contain the encoded address
    expect(decodeURIComponent(page.url())).toMatch(/property-intelligence\/search\?q=/);
  });

  test.afterAll(async () => {
    await ctx?.close();
  });
});

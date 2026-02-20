/**
 * Contracts Module: Norweco Pricing Suggestion E2E
 *
 * Verifies that when office staff create a service contract for a customer
 * with system_type=aerobic and manufacturer=norweco, the NewContractForm
 * Step 3 shows a purple pricing callout suggesting:
 *   - Bio-Kinetic Basket Cleaning ($75/yr)
 *   - Air Filter Replacement ($10/yr)
 * And that clicking "+ Add" pre-populates those as add-ons.
 *
 * Auth: Login as first test() — Clover pattern (clearCookies + waitForTimeout(2000))
 * Customer: Seeded via API with unique timestamp name, cleaned up after test
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const APP_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

test.describe.serial("Contracts: Norweco Pricing Suggestion", () => {
  let ctx: BrowserContext;
  let page: Page;
  let seededCustomerId: string;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testFirstName = "Norweco";
  const testLastName = `TestE2E${uniqueSuffix}`;

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

  test("1. Seed Norweco aerobic customer via API", async () => {
    const result = await page.evaluate(async ({ apiUrl, firstName, lastName }) => {
      const res = await fetch(`${apiUrl}/customers/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          system_type: "aerobic",
          manufacturer: "norweco",
          email: `norweco-test-${Date.now()}@example.com`,
          phone: "5125550001",
          address_line1: "123 Test St",
          city: "San Marcos",
          state: "TX",
          postal_code: "78666",
          is_active: true,
        }),
      });
      return { status: res.status, data: await res.json() };
    }, { apiUrl: API_URL, firstName: testFirstName, lastName: testLastName });

    console.log(`Seeded customer: ${result.status} — ${JSON.stringify(result.data).slice(0, 100)}`);
    expect(result.status).toBe(201);
    seededCustomerId = result.data.id;
    expect(seededCustomerId).toBeTruthy();
    console.log(`Customer ID: ${seededCustomerId}, name: ${testFirstName} ${testLastName}`);
  });

  test("2. Navigate to /contracts and open New Contract tab", async () => {
    await page.goto(`${APP_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Click the "New Contract" tab (icon ➕, label "New Contract")
    await page.getByRole("button", { name: /New Contract|New/i }).first().click();
    await page.waitForTimeout(500);

    // Step 1 header should be visible
    await expect(page.getByText(/Select Contract Type/i)).toBeVisible({ timeout: 8000 });
  });

  test("3. Step 1: Select contract type (Typical Yearly Maintenance)", async () => {
    // Click on the "Typical Yearly Maintenance" card
    await page.getByText("Typical Yearly Maintenance").click();
    await page.waitForTimeout(500);

    // Should advance to Step 2 (Choose Customer) — use heading to avoid strict mode violation
    await expect(page.getByRole("heading", { name: /Choose Customer/i })).toBeVisible({ timeout: 8000 });
  });

  test("4. Step 2: Search and select the seeded Norweco customer", async () => {
    // Type the unique last name into the customer search box
    const searchInput = page.locator('input[id="customer-search"], input[placeholder*="Search by name"]');
    await searchInput.fill(testLastName);
    await page.waitForTimeout(1000); // debounce

    // Click the matching result
    await page.getByText(`${testFirstName} ${testLastName}`).first().click();
    await page.waitForTimeout(500);

    // "Continue to Details" button should appear
    await expect(page.getByRole("button", { name: /Continue to Details/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Continue to Details/i }).click();
    await page.waitForTimeout(500);

    // Should advance to Step 3
    await expect(page.getByText(/Contract Details & Add-Ons/i)).toBeVisible({ timeout: 8000 });
  });

  test("5. Step 3: Purple Norweco pricing callout is visible", async () => {
    // The purple callout should appear automatically for aerobic Norweco customers
    await expect(
      page.getByText(/Norweco Aerobic System — Premium Pricing Recommended/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test("6. Bio-Kinetic Basket Cleaning line item shown at $75/yr", async () => {
    // Use exact match to avoid matching premiumReason paragraph ("bio-kinetic basket" lowercase)
    await expect(page.getByText("Bio-Kinetic Basket Cleaning", { exact: true })).toBeVisible({ timeout: 5000 });
    // $75 appears in the callout
    const priceCells = page.getByText(/\$75/);
    await expect(priceCells.first()).toBeVisible();
  });

  test("7. Air Filter Replacement line item shown at $10/yr", async () => {
    // Use exact match to avoid potential premiumReason overlap
    await expect(page.getByText("Air Filter Replacement", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/\$10/).first()).toBeVisible();
  });

  test("8. Clicking '+ Add' on Bio-Kinetic Basket pre-populates add-on", async () => {
    // Bio-Kinetic Basket Cleaning is the FIRST line item — click the first "+ Add" button
    const addButton = page.getByRole("button", { name: "+ Add" }).first();

    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();
    await page.waitForTimeout(300);

    // Button should now show "✓ Added"
    await expect(page.getByRole("button", { name: /✓ Added|Added/i }).first()).toBeVisible({ timeout: 3000 });
  });

  test.afterAll(async () => {
    // Clean up seeded customer regardless of test outcome
    if (!seededCustomerId || !page) return;
    try {
      await page.evaluate(async ({ apiUrl, customerId }) => {
        await fetch(`${apiUrl}/customers/${customerId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }, { apiUrl: API_URL, customerId: seededCustomerId });
      console.log(`Cleanup: deleted customer ${seededCustomerId}`);
    } catch {
      // Best-effort cleanup
    }
    await ctx?.close();
  });
});

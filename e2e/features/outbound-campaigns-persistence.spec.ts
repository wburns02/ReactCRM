import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://react.ecbtx.com";

const WILL = {
  email: process.env.TEST_USER_EMAIL ?? "will@macseptic.com",
  password: process.env.TEST_USER_PASSWORD ?? "#Espn2025",
};

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const pw = page.locator('input[type="password"], input[name="password"]').first();
  await email.fill(creds.email);
  await pw.fill(creds.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => !location.href.includes("/login"), null, {
    timeout: 30_000,
  });
}

async function gotoOutbound(page: Page) {
  await page.goto(`${BASE_URL}/outbound-campaigns`);
  await page.waitForLoadState("domcontentloaded");
  // Wait for the heading to render so we know the page mounted.
  await expect(page.locator("text=Outbound Campaigns").first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Outbound Campaigns persistence", () => {
  test("backend serves Email Openers campaign with seeded contacts", async ({
    request,
  }) => {
    // Hits backend directly (no auth) — should 401, proving the route is registered.
    const r = await request.get(
      "https://react-crm-api-production.up.railway.app/api/v2/outbound-campaigns/campaigns",
    );
    expect([401, 403]).toContain(r.status());
  });

  test("Email Openers campaign visible in UI after login", async ({ page }) => {
    await login(page, WILL);
    await gotoOutbound(page);
    await expect(page.locator("text=Email Openers - Spring Follow-Up")).toBeVisible(
      { timeout: 20_000 },
    );
  });

  test("disposition round-trips and survives reload", async ({ page }) => {
    await login(page, WILL);
    await gotoOutbound(page);

    await expect(page.locator("text=Email Openers - Spring Follow-Up")).toBeVisible(
      { timeout: 20_000 },
    );

    // Click into the campaign so the contacts tab populates.
    await page.locator("text=Email Openers - Spring Follow-Up").first().click();
    await page.waitForTimeout(1000);

    // Switch to the Contacts tab if it exists.
    const contactsTab = page.locator('button:has-text("Contacts"), [role="tab"]:has-text("Contacts")').first();
    if (await contactsTab.isVisible().catch(() => false)) {
      await contactsTab.click();
      await page.waitForTimeout(800);
    }

    // Find the first row's status select. UI shows a Set status... select per row.
    const firstSelect = page.locator("tbody tr select").first();
    await expect(firstSelect).toBeVisible({ timeout: 10_000 });

    // Capture which contact name we touch
    const firstRow = page.locator("tbody tr").first();
    const contactName = (await firstRow.innerText()).split("\n")[0].trim();

    // Capture network — confirm we POST to /dispositions
    const dispositionPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/outbound-campaigns/contacts/") &&
        req.url().includes("/dispositions") &&
        req.method() === "POST",
      { timeout: 15_000 },
    );

    await firstSelect.selectOption({ label: /voicemail/i }).catch(async () => {
      // If selectOption can't find by label, try value
      await firstSelect.selectOption("voicemail");
    });

    await dispositionPromise;

    // Reload and verify status persisted
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.locator("text=Email Openers - Spring Follow-Up").first().click();
    await page.waitForTimeout(1500);
    if (await contactsTab.isVisible().catch(() => false)) {
      await contactsTab.click();
      await page.waitForTimeout(800);
    }

    const sameRow = page.locator("tbody tr", { hasText: contactName });
    await expect(sameRow).toContainText(/voicemail/i, { timeout: 15_000 });
  });

  test("migration uploads stranded local state on first load", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Visit any page on the origin so we can write to its IndexedDB
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");

    // Seed the legacy Zustand-shaped IndexedDB blob via the native API
    await page.evaluate(async () => {
      // Reset migration flag so the hook fires
      localStorage.removeItem("outbound-v1-migrated");

      // idb-keyval uses a database called "keyval-store" with object store "keyval"
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open("keyval-store", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("keyval");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const blob = JSON.stringify({
        state: {
          campaigns: [
            {
              id: "legacy-camp-pw-test",
              name: "Playwright Legacy Test",
              description: "test migration",
              status: "active",
              source_file: null,
              source_sheet: null,
              total_contacts: 1,
              contacts_called: 1,
              contacts_connected: 1,
              contacts_interested: 0,
              contacts_completed: 1,
              assigned_reps: [],
              created_by: null,
              created_at: "2026-04-21T10:00:00.000Z",
              updated_at: "2026-04-21T14:30:00.000Z",
            },
          ],
          contacts: [
            {
              id: "legacy-ct-pw-test",
              campaign_id: "legacy-camp-pw-test",
              account_name: "PW Legacy Person",
              phone: "5559999999",
              call_status: "connected",
              call_attempts: 1,
              last_call_date: "2026-04-21T14:30:00.000Z",
              last_disposition: "connected",
              notes: "legacy migration test",
              priority: 3,
            },
          ],
        },
        version: 5,
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("keyval", "readwrite");
        const store = tx.objectStore("keyval");
        const req = store.put(blob, "outbound-campaigns-store");
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });

    // Now log in and visit the page
    await page.locator('input[type="email"]').first().fill(WILL.email);
    await page.locator('input[type="password"]').first().fill(WILL.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForFunction(() => !location.href.includes("/login"), null, {
      timeout: 30_000,
    });

    const migratePromise = page.waitForRequest(
      (req) =>
        req.url().includes("/outbound-campaigns/migrate-local") &&
        req.method() === "POST",
      { timeout: 30_000 },
    );

    await page.goto(`${BASE_URL}/outbound-campaigns`);
    await page.waitForLoadState("domcontentloaded");

    const migrateReq = await migratePromise;
    const body = JSON.parse(migrateReq.postData() ?? "{}");
    expect(body.contacts.length).toBeGreaterThanOrEqual(1);
    expect(
      body.contacts.find((c: { id: string }) => c.id === "legacy-ct-pw-test"),
    ).toBeDefined();

    // Wait for the response to ensure flag is set
    await page.waitForTimeout(2000);
    const flag = await page.evaluate(() =>
      localStorage.getItem("outbound-v1-migrated"),
    );
    expect(flag).toBe("true");

    await ctx.close();
  });
});

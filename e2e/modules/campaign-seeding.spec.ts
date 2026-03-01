import { test, expect } from "@playwright/test";

/**
 * Test that geographical zone campaigns auto-seed from built-in Sherrie Sheet data
 * when IndexedDB store is empty. Tests against production.
 */
test.describe("Campaign Auto-Seeding", () => {
  test("geographical zone campaigns auto-seed when store is empty", async ({ page }) => {
    // Login
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || "test@macseptic.com");
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || "TestPassword123");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Clear campaign data from both localStorage and IndexedDB to force re-seed
    await page.evaluate(async () => {
      localStorage.setItem("crm_onboarding_completed", "true");
      localStorage.removeItem("outbound-campaigns-store");
      // Also clear IndexedDB (idb-keyval uses "keyval-store" database)
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });

    // Navigate to outbound campaigns - this triggers auto-seeding
    await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });

    // Wait for seed data to load (lazy import + processing ~8k contacts into IndexedDB)
    await page.waitForTimeout(15000);

    // Reload to ensure store has fully hydrated from IndexedDB
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Verify page loaded
    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible({ timeout: 10000 });

    // Verify "No campaigns yet" is NOT showing
    const emptyState = page.locator("text=No campaigns yet");
    await expect(emptyState).not.toBeVisible({ timeout: 3000 });

    // Verify geographical zone campaigns are present
    // Check for at least Zone 1 which should always load
    await expect(page.getByRole("heading", { name: "Zone 1 - Home Base", exact: true })).toBeAttached({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Zone 2 - Local", exact: true })).toBeAttached({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Zone 3 - Regional", exact: true })).toBeAttached({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Zone 4 - Extended", exact: true })).toBeAttached({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: "Zone 5 - Outer", exact: true })).toBeAttached({ timeout: 5000 });
  });
});

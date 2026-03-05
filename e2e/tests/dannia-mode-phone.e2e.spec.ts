import { test, expect } from "@playwright/test";

test.describe("Dannia Mode — Will's Cell Override", () => {
  test("Dannia Mode dashboard shows Will's phone number (979) 236-1958 on contacts", async ({
    page,
  }) => {
    const BASE = "https://react.ecbtx.com";

    // Login directly
    await page.goto(BASE + "/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill('input[type="email"]', "test@macseptic.com");
    await page.fill('input[type="password"]', "TestPassword123");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    // Navigate to outbound campaigns
    await page.goto(BASE + "/outbound-campaigns");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5000); // Wait for IndexedDB data to hydrate/seed

    // Take screenshot to see current state
    await page.screenshot({
      path: "test-results/dannia-before-toggle.png",
      fullPage: true,
    });

    // Check if we see the outbound campaigns page (not login)
    const pageContent = await page.textContent("body");
    console.log(
      "Page contains 'Outbound':",
      pageContent?.includes("Outbound"),
    );
    console.log(
      "Page contains 'Dannia':",
      pageContent?.includes("Dannia"),
    );

    // Enable Dannia mode via JavaScript (more reliable than UI click)
    await page.evaluate(() => {
      // Access Zustand store directly
      const store = (window as any).__ZUSTAND_STORE__;
      if (store) {
        store.getState().setDanniaMode(true);
      }
    });

    // Alternative: try clicking the Dannia Mode button if store isn't exposed
    const danniaBtn = page.locator("button", { hasText: "Dannia Mode" }).first();
    if (await danniaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await danniaBtn.click();
      await page.waitForTimeout(3000);
    }

    // Check if Dannia Mode activated (look for "Autonomous outbound engine" text)
    const danniaActive = await page
      .locator("text=Autonomous outbound engine")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!danniaActive) {
      // Try enabling via store manipulation on the page
      await page.evaluate(() => {
        // Try to find the store through the React fiber tree
        const el = document.querySelector("[data-dannia]");
        if (el) return; // Already in Dannia mode

        // Set it via localStorage override - store will pick it up on next hydration
        const key = "outbound-campaigns-store";
        // Use idb-keyval to set the store
        const req = indexedDB.open("keyval-store", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("keyval", "readwrite");
          const store = tx.objectStore("keyval");
          const getReq = store.get(key);
          getReq.onsuccess = () => {
            const data = getReq.result;
            if (data && data.state) {
              data.state.danniaMode = true;
              store.put(data, key);
            }
          };
        };
      });

      // Reload to pick up the IndexedDB change
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(5000);
    }

    // Take screenshot of current state
    await page.screenshot({
      path: "test-results/dannia-after-toggle.png",
      fullPage: true,
    });

    // Check for Will's phone number on the page
    const phoneText = page.locator("text=(979) 236-1958");
    const phoneCount = await phoneText.count();
    console.log(
      `Found ${phoneCount} instances of (979) 236-1958 on the page`,
    );

    // Check for Dannia mode indicators
    const hasDanniaAttr = await page
      .locator("[data-dannia]")
      .isVisible()
      .catch(() => false);
    console.log(`data-dannia attribute present: ${hasDanniaAttr}`);

    const hasNextUp = await page
      .locator("text=Next Up")
      .isVisible()
      .catch(() => false);
    console.log(`Next Up section visible: ${hasNextUp}`);

    // Verify phone number is shown
    expect(phoneCount).toBeGreaterThan(0);
  });
});

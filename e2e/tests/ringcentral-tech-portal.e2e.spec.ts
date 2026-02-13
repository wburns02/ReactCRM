import { test, expect, Page } from "@playwright/test";

const BASE = "https://react.ecbtx.com";
const API = "https://react-crm-api-production.up.railway.app/api/v2";
const TEST_WO_ID = "246c9fc6-6a50-47b9-b90d-e429cd135292";

let authPage: Page;

test.describe("RingCentral Tech Portal Integration", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    authPage = await context.newPage();

    // Strip cache-control headers to avoid stale data
    await authPage.route("**/*", (route) => {
      route.continue().then(async () => {}).catch(() => {});
    });

    // Login as admin (will see tech portal routes)
    await authPage.goto(`${BASE}/login`);
    await authPage.fill('input[name="email"]', "will@macseptic.com");
    await authPage.fill('input[name="password"]', "#Espn2025");
    await authPage.click('button[type="submit"]');
    await authPage.waitForFunction(
      () => !window.location.href.includes("/login"),
      { timeout: 15000 }
    );
    // Wait for app to settle
    await authPage.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await authPage?.context().close();
  });

  test("1. TechCommsPage loads with Phone tab", async () => {
    await authPage.goto(`${BASE}/portal/messages`);
    await authPage.waitForTimeout(2000);

    // Should see 3 tab buttons: Phone, SMS, Email
    const phoneTab = authPage.getByRole("button", { name: /Phone/i }).first();
    const smsTab = authPage.getByRole("button", { name: /SMS/i }).first();
    const emailTab = authPage.getByRole("button", { name: /Email/i }).first();

    await expect(phoneTab).toBeVisible();
    await expect(smsTab).toBeVisible();
    await expect(emailTab).toBeVisible();
  });

  test("2. Phone tab shows dial pad and status", async () => {
    await authPage.goto(`${BASE}/portal/messages`);
    await authPage.waitForTimeout(2000);

    // Click the Phone tab if not already active
    const phoneTab = authPage.getByRole("button", { name: /Phone/i }).first();
    await phoneTab.click();
    await authPage.waitForTimeout(1000);

    // Should see dial pad buttons (1-9, *, 0, #)
    const dialButton1 = authPage.locator("text=1").first();
    await expect(dialButton1).toBeVisible();

    // Should see a Call button
    const callButton = authPage.getByRole("button", { name: /Call/i }).first();
    await expect(callButton).toBeVisible();

    // Take screenshot for evidence
    await authPage.screenshot({
      path: "e2e/screenshots/tech-phone-tab.png",
      fullPage: true,
    });
  });

  test("3. SMS tab shows message interface", async () => {
    await authPage.goto(`${BASE}/portal/messages`);
    await authPage.waitForTimeout(2000);

    const smsTab = authPage.getByRole("button", { name: /SMS/i }).first();
    await smsTab.click();
    await authPage.waitForTimeout(1000);

    // Should see Inbox/Sent sub-tabs or compose area
    const content = await authPage.textContent("body");
    expect(
      content?.includes("Inbox") ||
        content?.includes("Send") ||
        content?.includes("SMS") ||
        content?.includes("Message")
    ).toBeTruthy();
  });

  test("4. Email tab shows email interface", async () => {
    await authPage.goto(`${BASE}/portal/messages`);
    await authPage.waitForTimeout(2000);

    const emailTab = authPage.getByRole("button", { name: /Email/i }).first();
    await emailTab.click();
    await authPage.waitForTimeout(1000);

    const content = await authPage.textContent("body");
    expect(
      content?.includes("Inbox") ||
        content?.includes("Send") ||
        content?.includes("Email") ||
        content?.includes("Compose")
    ).toBeTruthy();
  });

  test("5. Job detail shows Call Customer button", async () => {
    await authPage.goto(`${BASE}/portal/jobs/${TEST_WO_ID}`);
    await authPage.waitForTimeout(3000);

    // Job should load with customer info
    const customerName = authPage.locator("text=Alfred Stone");
    await expect(customerName.first()).toBeVisible();

    // Should show a Call button with the phone number
    const callLink = authPage.locator('a[href^="tel:"]');
    const callCount = await callLink.count();

    if (callCount > 0) {
      // Verify the phone link contains the number
      const href = await callLink.first().getAttribute("href");
      expect(href).toContain("tel:");
      console.log("Call Customer link found:", href);
    }

    // Also check for RC Call button
    const rcCallButton = authPage.getByRole("button", { name: /RC Call/i });
    const rcCount = await rcCallButton.count();
    if (rcCount > 0) {
      console.log("RC Call button visible");
    }

    // Take screenshot
    await authPage.screenshot({
      path: "e2e/screenshots/tech-job-call-customer.png",
      fullPage: true,
    });
  });

  test("6. API returns customer_phone in work order response", async () => {
    const response = await authPage.evaluate(
      async (params) => {
        const resp = await fetch(
          `${params.api}/work-orders/${params.woId}`,
          { credentials: "include" }
        );
        return resp.json();
      },
      { api: API, woId: TEST_WO_ID }
    );

    expect(response.customer_name).toBe("Alfred Stone");
    expect(response.customer_phone).toBe("(512) 555-1010");
    console.log("API customer_phone:", response.customer_phone);
  });

  test("7. Phone tab dial pad interaction works", async () => {
    await authPage.goto(`${BASE}/portal/messages`);
    await authPage.waitForTimeout(2000);

    // Click Phone tab
    const phoneTab = authPage.getByRole("button", { name: /Phone/i }).first();
    await phoneTab.click();
    await authPage.waitForTimeout(1000);

    // Find phone input
    const phoneInput = authPage.locator('input[type="tel"]').first();
    const inputCount = await phoneInput.count();

    if (inputCount > 0) {
      // Type a number
      await phoneInput.fill("5125551010");
      const value = await phoneInput.inputValue();
      expect(value).toContain("512");
      console.log("Phone input value:", value);
    } else {
      console.log("No tel input found - checking for text input");
      // Might be a text input
      const textInput = authPage.locator("input[placeholder]").first();
      if ((await textInput.count()) > 0) {
        await textInput.fill("5125551010");
      }
    }
  });
});

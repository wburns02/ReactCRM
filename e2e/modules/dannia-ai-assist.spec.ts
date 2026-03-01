import { test, expect } from "@playwright/test";

function buildStoreData() {
  const now = new Date().toISOString();
  const campaignId = "test-campaign-ai-assist";

  const contacts = Array.from({ length: 5 }, (_, i) => ({
    id: `ai${i + 1}`,
    campaign_id: campaignId,
    account_number: `300${i}`,
    account_name: [
      "Smith Residence", "Jones Commercial", "Adams Family",
      "Wilson Home", "Park Systems",
    ][i],
    company: i === 1 ? "Jones LLC" : null,
    phone: `512555${String(2000 + i)}`,
    email: `aitest${i}@test.com`,
    address: `${200 + i} Test Ave`,
    city: "San Marcos",
    state: "TX",
    zip_code: "78666",
    service_zone: ["Zone 1 - Home Base", "Zone 2 - Local", "Zone 1 - Home Base", "Zone 3 - Regional", "Zone 2 - Local"][i],
    system_type: i % 2 === 0 ? "Aerobic" : "Conventional",
    contract_type: "Annual",
    contract_status: i < 3 ? "Expired" : "Active",
    contract_start: "2023-01-01",
    contract_end: i < 3 ? "2024-01-01" : "2027-01-01",
    contract_value: null,
    days_since_expiry: i < 3 ? 400 + i * 30 : null,
    customer_type: i === 1 ? "Commercial" : "Residential",
    call_priority_label: i < 2 ? "High" : "Medium",
    call_status: "pending" as const,
    call_attempts: i === 0 ? 2 : 0,
    last_call_date: i === 0 ? "2026-02-15T10:00:00Z" : null,
    last_call_duration: i === 0 ? 45 : null,
    last_disposition: i === 0 ? "no_answer" : null,
    notes: i === 0 ? "No answer, try again in afternoon" : null,
    callback_date: null,
    assigned_rep: null,
    priority: i < 2 ? 3 : 2,
    created_at: now,
    updated_at: now,
  }));

  return {
    state: {
      campaigns: [{
        id: campaignId,
        name: "AI Assist Test Campaign",
        description: "E2E AI assist test",
        status: "active" as const,
        source_file: "test.xlsx",
        source_sheet: "Zone 1",
        total_contacts: contacts.length,
        contacts_called: 0,
        contacts_connected: 0,
        contacts_interested: 0,
        contacts_completed: 0,
        assigned_reps: [],
        created_by: null,
        created_at: now,
        updated_at: now,
      }],
      contacts,
      activeCampaignId: null,
      dialerContactIndex: 0,
      dialerActive: false,
      danniaMode: false,
      autoDialEnabled: false,
      autoDialDelay: 5,
      sortOrder: "default" as const,
      campaignAutomationConfigs: {},
    },
    version: 5,
  };
}

async function loginAndSetup(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || "test@macseptic.com");
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || "TestPassword123");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    localStorage.setItem("crm_onboarding_completed", "true");
  });

  // Inject test data
  await page.evaluate(async (storeData) => {
    localStorage.setItem("outbound-campaigns-store", JSON.stringify(storeData));
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("keyval-store");
      req.onupgradeneeded = () => { req.result.createObjectStore("keyval"); };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("keyval", "readwrite");
        tx.objectStore("keyval").put(JSON.stringify(storeData), "outbound-campaigns-store");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, buildStoreData());

  await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
}

async function enableDanniaAndStartDialer(page: import("@playwright/test").Page) {
  await loginAndSetup(page);

  // Enable Dannia Mode
  await page.locator("button", { hasText: "Dannia Mode" }).click();
  await page.waitForTimeout(2000);
  await expect(page.locator("h1", { hasText: "Dannia Mode" })).toBeVisible({ timeout: 10000 });

  // Start dialing to get the PowerDialer + AgentAssist
  const startBtn = page.locator("button", { hasText: "START DIALING" });
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await startBtn.click();
  await page.waitForTimeout(3000);
}

test.describe("Dannia AI Assist — 3-Layer Real-Time Assistance", () => {
  test.describe.configure({ mode: "serial" });

  test("AgentAssist shows 3 tabs in Dannia Mode dialer", async ({ page }) => {
    await enableDanniaAndStartDialer(page);

    // AgentAssist should show 3 tabs: Quick Answers, Ask AI, Live Assist
    const quickTab = page.locator("button", { hasText: "Quick Answers" });
    const askAiTab = page.locator("button", { hasText: "Ask AI" });
    const liveTab = page.locator("button", { hasText: "Live Assist" });

    await expect(quickTab).toBeVisible({ timeout: 10000 });
    await expect(askAiTab).toBeVisible();
    await expect(liveTab).toBeVisible();

    // DANNIA badge should be visible
    await expect(page.locator("text=DANNIA")).toBeVisible();
  });

  test("Quick Answers tab renders contact-aware cards", async ({ page }) => {
    await enableDanniaAndStartDialer(page);

    // Quick Answers tab should be default in Dannia Mode
    const quickTab = page.locator("button", { hasText: "Quick Answers" });
    await quickTab.click();
    await page.waitForTimeout(1000);

    // Should see category filter chips
    const allChip = page.locator("button", { hasText: /^All \(/ });
    await expect(allChip).toBeVisible({ timeout: 10000 });

    // Should see pricing reference card
    const pricingCard = page.locator("text=Pricing Quick Reference");
    await expect(pricingCard).toBeVisible({ timeout: 5000 });

    // Click to expand a card
    await pricingCard.click();
    await page.waitForTimeout(500);

    // Should see the content with pricing info
    await expect(page.locator("text=$275-$400").first()).toBeVisible({ timeout: 3000 });
  });

  test("Ask AI tab responds to queries with KB match", async ({ page }) => {
    await enableDanniaAndStartDialer(page);

    // Switch to Ask AI tab
    const askAiTab = page.locator("button", { hasText: "Ask AI" });
    await askAiTab.click();
    await page.waitForTimeout(1000);

    // Should see quick prompt buttons
    const pumpingPrompt = page.locator("button", { hasText: "How much does pumping cost?" });
    await expect(pumpingPrompt).toBeVisible({ timeout: 5000 });

    // Click a quick prompt
    await pumpingPrompt.click();
    await page.waitForTimeout(2000);

    // Should show the KB answer with pricing info
    await expect(page.locator("text=AI Suggestion").first()).toBeVisible({ timeout: 5000 });
    // The response should contain pricing info
    await expect(page.locator("text=$275").first()).toBeVisible({ timeout: 3000 });
  });

  test("Live Assist tab shows transcription controls", async ({ page }) => {
    await enableDanniaAndStartDialer(page);

    // Switch to Live Assist tab
    const liveTab = page.locator("button", { hasText: "Live Assist" });
    await liveTab.click();
    await page.waitForTimeout(1000);

    // Should show a start/stop transcription button or "Start a call" message
    const startBtn = page.locator("button", { hasText: /Start|Stop/ });
    const startCallMsg = page.locator("text=Start a call");
    const notSupported = page.locator("text=Speech recognition is not supported");

    const hasStartBtn = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasStartMsg = await startCallMsg.isVisible({ timeout: 1000 }).catch(() => false);
    const hasNotSupported = await notSupported.isVisible({ timeout: 1000 }).catch(() => false);

    // At least one of these should be visible
    expect(hasStartBtn || hasStartMsg || hasNotSupported).toBe(true);
  });

  test("mobile responsive — 3-tab AI panel at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await enableDanniaAndStartDialer(page);

    // All 3 tabs should still be visible on mobile
    const quickTab = page.locator("button", { hasText: "Quick Answers" });
    const askAiTab = page.locator("button", { hasText: "Ask AI" });
    const liveTab = page.locator("button", { hasText: "Live Assist" });

    await expect(quickTab).toBeVisible({ timeout: 10000 });
    await expect(askAiTab).toBeVisible();
    await expect(liveTab).toBeVisible();

    // No horizontal overflow
    const overflows = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(overflows).toBe(false);
  });
});

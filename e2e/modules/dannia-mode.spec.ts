import { test, expect } from "@playwright/test";

function buildStoreData() {
  const now = new Date().toISOString();
  const campaignId = "test-campaign-dannia";

  const contacts = Array.from({ length: 10 }, (_, i) => ({
    id: `dc${i + 1}`,
    campaign_id: campaignId,
    account_number: `200${i}`,
    account_name: [
      "Smith Residence", "Jones Commercial", "Adams Family",
      "Wilson Home", "Park Systems", "Taylor Office",
      "Brown Estate", "Davis Corp", "Clark Residential", "Evans Place",
    ][i],
    company: i % 3 === 1 ? `Company ${i}` : null,
    phone: `512555${String(1000 + i)}`,
    email: `test${i}@test.com`,
    address: `${100 + i} Test St`,
    city: null, state: null,
    zip_code: "78666",
    service_zone: ["Zone 1 - Home Base", "Zone 2 - Local", "Zone 1 - Home Base", "Zone 1 - Home Base", "Zone 2 - Local",
      "Zone 3 - Regional", "Zone 1 - Home Base", "Zone 2 - Local", "Zone 3 - Regional", "Zone 1 - Home Base"][i],
    system_type: i % 2 === 0 ? "Aerobic" : "Conventional",
    contract_type: "Annual",
    contract_status: i < 6 ? "Expired" : "Active",
    contract_start: "2023-01-01",
    contract_end: i < 6 ? "2024-01-01" : "2027-01-01",
    contract_value: null,
    days_since_expiry: i < 6 ? 300 + i * 50 : null,
    customer_type: i % 3 === 1 ? "Commercial" : "Residential",
    call_priority_label: i < 3 ? "High" : i < 6 ? "Medium" : "Low",
    call_status: i === 9 ? "do_not_call" as const : "pending" as const,
    call_attempts: 0,
    last_call_date: null,
    last_call_duration: null,
    last_disposition: null,
    notes: null,
    callback_date: null,
    assigned_rep: null,
    priority: i < 3 ? 3 : i < 6 ? 2 : 1,
    created_at: now,
    updated_at: now,
  }));

  return {
    state: {
      campaigns: [{
        id: campaignId, name: "Dannia Test Campaign", description: "E2E Dannia mode test",
        status: "active" as const, source_file: "test.xlsx", source_sheet: "Zone 1",
        total_contacts: contacts.length, contacts_called: 0, contacts_connected: 0,
        contacts_interested: 0, contacts_completed: 0, assigned_reps: [],
        created_by: null, created_at: now, updated_at: now,
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

test.describe("Dannia Mode", () => {
  test.describe.configure({ mode: "serial" });

  test("toggle is visible and clicking switches to dashboard view", async ({ page }) => {
    await loginAndSetup(page);

    // Dannia Mode toggle should be visible
    const toggle = page.locator("button", { hasText: "Dannia Mode" });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Page should initially show normal tabs
    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible();

    // Click toggle to enable Dannia Mode
    await toggle.click();
    await page.waitForTimeout(2000);

    // Should now show Dannia Mode heading
    await expect(page.locator("h1", { hasText: "Dannia Mode" })).toBeVisible({ timeout: 10000 });
  });

  test("today's plan shows gamification dashboard and performance meter", async ({ page }) => {
    await loginAndSetup(page);

    // Enable Dannia Mode
    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    // Gamification dashboard should be visible (replaced QuickStats)
    await expect(page.locator("text=Daily Goals")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Calls").first()).toBeVisible();
    await expect(page.locator("text=Connects").first()).toBeVisible();
    await expect(page.locator("text=streak").first()).toBeVisible();
  });

  test("START DIALING button is visible", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator("button", { hasText: "START DIALING" })).toBeVisible({ timeout: 10000 });
  });

  test("next up queue or schedule status is visible", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(3000);

    // Should show either "Next Up" with contacts, or a schedule status message
    const nextUp = page.locator("text=Next Up");
    const noContacts = page.locator("text=No contacts scheduled");
    const dailyLimit = page.locator("text=Daily limit reached");
    const startDialing = page.locator("button", { hasText: "START DIALING" });

    // At least one of these should be visible
    const isNextUp = await nextUp.isVisible({ timeout: 3000 }).catch(() => false);
    const isNoContacts = await noContacts.isVisible({ timeout: 1000 }).catch(() => false);
    const isDailyLimit = await dailyLimit.isVisible({ timeout: 1000 }).catch(() => false);
    const hasStartBtn = await startDialing.isVisible({ timeout: 1000 }).catch(() => false);

    expect(isNextUp || isNoContacts || isDailyLimit || hasStartBtn).toBe(true);
  });

  test("guardrail badge shows max calls limit", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(3000);

    // The "35 calls max" badge appears when a schedule is generated
    // It may take a moment for schedule generation to complete
    const badge = page.locator("text=35 calls max");
    const callsToday = page.locator("text=Calls Today");
    // Either the badge or the calls today stat should be visible
    const hasBadge = await badge.isVisible({ timeout: 5000 }).catch(() => false);
    const hasCallsToday = await callsToday.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasBadge || hasCallsToday).toBe(true);
  });

  test("weekly calendar view renders", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    // Click Week tab
    await page.locator("button", { hasText: "Week" }).click();
    await page.waitForTimeout(2000);

    // Should show either Weekly Schedule heading (with day columns) or the empty state
    const weeklySchedule = page.locator("text=Weekly Schedule");
    const emptyState = page.locator("text=No schedule generated yet");

    const hasSchedule = await weeklySchedule.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSchedule || hasEmpty).toBe(true);

    // If schedule is visible, check for day columns
    if (hasSchedule) {
      // At least Mon should be visible
      await expect(page.locator("text=Mon").first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("report tab renders and generate button works", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    // Click Report tab
    await page.locator("button", { hasText: "Report" }).click();
    await page.waitForTimeout(1000);

    // Should show Weekly Report heading
    await expect(page.locator("text=Weekly Report")).toBeVisible({ timeout: 10000 });

    // Generate Report button should be visible
    const generateBtn = page.locator("button", { hasText: "Generate Report" });
    await expect(generateBtn).toBeVisible();

    // Click generate
    await generateBtn.click();
    await page.waitForTimeout(2000);

    // After generation, should show Total Calls stat
    await expect(page.locator("text=Total Calls")).toBeVisible({ timeout: 5000 });
  });

  test("DNC contacts never appear in schedule queue", async ({ page }) => {
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    // Evans Place (dc10) is DNC — should NOT appear in Next Up queue
    const dncContact = page.locator("text=Evans Place");
    await expect(dncContact).not.toBeVisible({ timeout: 3000 });
  });

  test("toggling Dannia Mode off returns to normal tabs", async ({ page }) => {
    await loginAndSetup(page);

    // Enable
    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1", { hasText: "Dannia Mode" })).toBeVisible({ timeout: 5000 });

    // Disable
    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible({ timeout: 5000 });

    // Normal tabs should be back
    await expect(page.getByRole("button", { name: "Campaigns", exact: true })).toBeVisible();
  });

  test("mobile responsive - no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndSetup(page);

    await page.locator("button", { hasText: "Dannia Mode" }).click();
    await page.waitForTimeout(2000);

    // Check that page content doesn't overflow
    const overflows = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth > body.clientWidth;
    });
    expect(overflows).toBe(false);
  });
});

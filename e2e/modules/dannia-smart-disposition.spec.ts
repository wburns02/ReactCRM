import { test, expect } from "@playwright/test";

function buildStoreData() {
  const now = new Date().toISOString();
  const campaignId = "test-campaign-smart-disp";

  const contacts = Array.from({ length: 5 }, (_, i) => ({
    id: `sd${i + 1}`,
    campaign_id: campaignId,
    account_number: `400${i}`,
    account_name: [
      "Smith Residence", "Jones Commercial", "Adams Family",
      "Wilson Home", "Park Systems",
    ][i],
    company: i === 1 ? "Jones LLC" : null,
    phone: `512555${String(3000 + i)}`,
    email: `sdtest${i}@test.com`,
    address: `${300 + i} Test Blvd`,
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
    call_attempts: 0,
    last_call_date: null,
    last_call_duration: null,
    last_disposition: null,
    notes: null,
    callback_date: null,
    assigned_rep: null,
    priority: i < 2 ? 3 : 2,
    created_at: now,
    updated_at: now,
  }));

  return {
    state: {
      campaigns: [{
        id: campaignId, name: "Smart Disp Test", description: "E2E smart disposition test",
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

function buildDanniaStoreData(contactIds: string[]) {
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();
  const mondayDate = new Date();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  mondayDate.setDate(mondayDate.getDate() + diff);
  const weekStart = mondayDate.toISOString().split("T")[0];
  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(fridayDate.getDate() + 4);
  const weekEnd = fridayDate.toISOString().split("T")[0];

  const days = [];
  days.push({
    date: today, dayOfWeek,
    blocks: [
      { id: "block-prep", type: "prep", label: "Prep Buffer", startHour: 8.5, endHour: 9, capacity: 0, contactIds: [] as string[], completedIds: [] as string[] },
      { id: "block-morning", type: "high_connect", label: "Morning Prime", startHour: 0, endHour: 23.99, capacity: 14, contactIds: contactIds.slice(0, 5), completedIds: [] as string[] },
    ],
    totalCapacity: 14, completedCount: 0, skippedCount: 0,
  });
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr === today) continue;
    days.push({
      date: dateStr, dayOfWeek: d.getDay(),
      blocks: [{ id: `block-${i}`, type: "high_connect", label: "Morning Prime", startHour: 9, endHour: 11, capacity: 7, contactIds: contactIds.slice(0, 3), completedIds: [] as string[] }],
      totalCapacity: 7, completedCount: 0, skippedCount: 0,
    });
  }

  return {
    state: {
      currentSchedule: { id: "test-schedule", weekStart, weekEnd, days, generatedAt: new Date().toISOString(), callbackReserve: 5 },
      performanceMetrics: { todayCallsMade: 0, todayConnected: 0, todayInterested: 0, todayVoicemails: 0, connectRate: 0, interestRate: 0, callsPerHour: 0, currentStreak: 0, bestStreak: 0, hourlyData: [] },
      callbacks: [],
      auditLog: [],
      config: { maxCallsPerDay: 35, callbackReservePercent: 15, workStartHour: 8.5, workEndHour: 16.5, lunchStartHour: 12, lunchEndHour: 13, avgCallCycleMinutes: 7, bufferMinutesPerHour: 10, connectRateThreshold: 15, interestRateThreshold: 5, lowVelocityThreshold: 4, failureWindowHours: 2 },
      weeklyReports: [],
      earnedBadges: [],
      lifetimeStats: { totalCalls: 0, totalConnected: 0, totalInterested: 0, totalVoicemails: 0, totalDaysWorked: 0, longestStreak: 0, bestDayCalls: 0, bestDayConnectRate: 0 },
      voicemailDropConfig: { vmExtension: "", enabled: false, dropCount: 0 },
    },
    version: 2,
  };
}

async function loginAndOpenDialer(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.fill('input[name="email"], input[type="email"]', process.env.TEST_EMAIL || "test@macseptic.com");
  await page.fill('input[name="password"], input[type="password"]', process.env.TEST_PASSWORD || "TestPassword123");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForFunction(() => !location.href.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.evaluate(() => { localStorage.setItem("crm_onboarding_completed", "true"); });

  const storeData = buildStoreData();
  const contactIds = storeData.state.contacts.map((c) => c.id);
  const danniaData = buildDanniaStoreData(contactIds);

  await page.evaluate(async ({ outbound, dannia }) => {
    localStorage.setItem("outbound-campaigns-store", JSON.stringify(outbound));
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("keyval-store");
      req.onupgradeneeded = () => { req.result.createObjectStore("keyval"); };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("keyval", "readwrite");
        const store = tx.objectStore("keyval");
        store.put(JSON.stringify(outbound), "outbound-campaigns-store");
        store.put(JSON.stringify(dannia), "dannia-mode-store");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { outbound: storeData, dannia: danniaData });

  await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const toggle = page.locator("button", { hasText: "Dannia Mode" });
  await expect(toggle).toBeVisible({ timeout: 10000 });
  await toggle.click();
  await page.waitForTimeout(3000);
  await expect(page.locator("h1", { hasText: "Dannia Mode" })).toBeVisible({ timeout: 10000 });

  const startBtn = page.locator("button", { hasText: "START DIALING" });
  await expect(startBtn).toBeEnabled({ timeout: 20000 });
  await startBtn.click();
  await expect(page.locator("text=Power Dialer")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe("Dannia Smart Disposition + Quick Notes", () => {
  test.setTimeout(60000);

  test("smart disposition panel renders in Dannia Mode dialer", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Should show "Smart Disposition" label instead of regular "Disposition"
    await expect(page.locator("text=Smart Disposition")).toBeVisible({ timeout: 10000 });

    // Should have a large primary button (first recommendation)
    // The primary button should contain one of the smart disposition labels
    const primaryBtn = page.locator("button").filter({ hasText: /No Answer|Left Voicemail|Interested|Not Interested|Busy/ }).first();
    await expect(primaryBtn).toBeVisible({ timeout: 5000 });
  });

  test("'More options' expands to full 9-button grid", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Click "More options" expander
    const moreBtn = page.locator("button", { hasText: "More options" });
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();
    await page.waitForTimeout(500);

    // Full grid should now show all 9 statuses
    await expect(page.locator("button", { hasText: "Interested" }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator("button", { hasText: "Not Interested" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Voicemail" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "No Answer" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Wrong Number" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Do Not Call" }).first()).toBeVisible();

    // "Hide options" should now be visible
    await expect(page.locator("button", { hasText: "Hide options" })).toBeVisible();
  });

  test("note template chips are visible", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Quick Notes section should be visible
    await expect(page.locator("text=Quick Notes")).toBeVisible({ timeout: 10000 });

    // At least one template chip should be visible
    const chips = page.locator("button").filter({ hasText: /Left VM|Wants annual|Has another|Call back/ });
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThan(0);
  });

  test("mobile responsive at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndOpenDialer(page);

    await expect(page.locator("text=Smart Disposition")).toBeVisible({ timeout: 10000 });

    const overflows = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflows).toBe(false);
  });
});

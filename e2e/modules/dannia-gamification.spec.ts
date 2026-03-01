import { test, expect } from "@playwright/test";

function buildStoreData() {
  const now = new Date().toISOString();
  const campaignId = "test-campaign-gamification";

  const contacts = Array.from({ length: 5 }, (_, i) => ({
    id: `gm${i + 1}`,
    campaign_id: campaignId,
    account_number: `500${i}`,
    account_name: [
      "Smith Residence", "Jones Commercial", "Adams Family",
      "Wilson Home", "Park Systems",
    ][i],
    company: i === 1 ? "Jones LLC" : null,
    phone: `512555${String(4000 + i)}`,
    email: `gmtest${i}@test.com`,
    address: `${400 + i} Test Dr`,
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
        id: campaignId, name: "Gamification Test", description: "E2E gamification test",
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

function buildDanniaStoreData(contactIds: string[], withBadges = false) {
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
      performanceMetrics: withBadges
        ? { todayCallsMade: 12, todayConnected: 4, todayInterested: 1, todayVoicemails: 3, connectRate: 33.3, interestRate: 25, callsPerHour: 6, currentStreak: 3, bestStreak: 5, hourlyData: [] }
        : { todayCallsMade: 0, todayConnected: 0, todayInterested: 0, todayVoicemails: 0, connectRate: 0, interestRate: 0, callsPerHour: 0, currentStreak: 0, bestStreak: 0, hourlyData: [] },
      callbacks: [],
      auditLog: [],
      config: { maxCallsPerDay: 35, callbackReservePercent: 15, workStartHour: 8.5, workEndHour: 16.5, lunchStartHour: 12, lunchEndHour: 13, avgCallCycleMinutes: 7, bufferMinutesPerHour: 10, connectRateThreshold: 15, interestRateThreshold: 5, lowVelocityThreshold: 4, failureWindowHours: 2 },
      weeklyReports: [],
      earnedBadges: withBadges ? ["first_ring", "warming_up", "hot_streak", "closer"] : [],
      lifetimeStats: withBadges
        ? { totalCalls: 45, totalConnected: 12, totalInterested: 3, totalVoicemails: 10, totalDaysWorked: 3, longestStreak: 5, bestDayCalls: 15, bestDayConnectRate: 35 }
        : { totalCalls: 0, totalConnected: 0, totalInterested: 0, totalVoicemails: 0, totalDaysWorked: 0, longestStreak: 0, bestDayCalls: 0, bestDayConnectRate: 0 },
      voicemailDropConfig: { vmExtension: "", enabled: false, dropCount: 0 },
    },
    version: 2,
  };
}

async function loginAndEnableDannia(page: import("@playwright/test").Page, withBadges = false) {
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
  const danniaData = buildDanniaStoreData(contactIds, withBadges);

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
}

test.describe("Dannia Gamification Dashboard", () => {
  test.setTimeout(60000);

  test("gamification widget renders with daily goal rings in Today's Plan", async ({ page }) => {
    await loginAndEnableDannia(page);

    // "Daily Goals" label should be visible
    await expect(page.locator("text=Daily Goals")).toBeVisible({ timeout: 10000 });

    // Three goal labels should be present
    await expect(page.locator("text=Calls").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Connects").first()).toBeVisible();
    await expect(page.locator("text=Interested").first()).toBeVisible();
  });

  test("streak counter displays", async ({ page }) => {
    await loginAndEnableDannia(page);

    // Streak text should be visible
    await expect(page.locator("text=streak").first()).toBeVisible({ timeout: 10000 });
  });

  test("badge section shows earned badges with injected data", async ({ page }) => {
    await loginAndEnableDannia(page, true);

    // "Badges Earned" section should be visible
    await expect(page.locator("text=Badges Earned")).toBeVisible({ timeout: 10000 });

    // Specific badge names should show
    await expect(page.locator("text=First Ring")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Warming Up")).toBeVisible();
    await expect(page.locator("text=Hot Streak")).toBeVisible();
    await expect(page.locator("text=Closer")).toBeVisible();
  });

  test("daily goals show correct targets (35 calls)", async ({ page }) => {
    await loginAndEnableDannia(page);

    // The /35 target should appear for calls
    await expect(page.locator("text=/35")).toBeVisible({ timeout: 10000 });
  });
});

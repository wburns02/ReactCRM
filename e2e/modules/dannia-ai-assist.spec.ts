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

/**
 * Build a dannia-mode-store with a schedule that includes TODAY,
 * regardless of what day of the week it is (works on weekends too).
 */
function buildDanniaStoreData(contactIds: string[]) {
  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  // Calculate Monday of this week (same as getWeekStart in the app)
  const mondayDate = new Date();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  mondayDate.setDate(mondayDate.getDate() + diff);
  const weekStart = mondayDate.toISOString().split("T")[0];

  const fridayDate = new Date(mondayDate);
  fridayDate.setDate(fridayDate.getDate() + 4);
  const weekEnd = fridayDate.toISOString().split("T")[0];

  // Create day plans for Mon-Fri AND today (if today is weekend)
  const days = [];

  // Always include today with contacts
  days.push({
    date: today,
    dayOfWeek,
    blocks: [
      {
        id: "block-prep",
        type: "prep",
        label: "Prep Buffer",
        startHour: 8.5,
        endHour: 9,
        capacity: 0,
        contactIds: [] as string[],
        completedIds: [] as string[],
      },
      {
        id: "block-morning",
        type: "high_connect",
        label: "Morning Prime",
        startHour: 0,
        endHour: 23.99,
        capacity: 14,
        contactIds: contactIds.slice(0, 5),
        completedIds: [] as string[],
      },
    ],
    totalCapacity: 14,
    completedCount: 0,
    skippedCount: 0,
  });

  // Add weekday plans too (Mon-Fri)
  for (let i = 0; i < 5; i++) {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr === today) continue; // already added
    days.push({
      date: dateStr,
      dayOfWeek: d.getDay(),
      blocks: [{
        id: `block-${i}`,
        type: "high_connect",
        label: "Morning Prime",
        startHour: 9,
        endHour: 11,
        capacity: 7,
        contactIds: contactIds.slice(0, 3),
        completedIds: [] as string[],
      }],
      totalCapacity: 7,
      completedCount: 0,
      skippedCount: 0,
    });
  }

  return {
    state: {
      currentSchedule: {
        id: "test-schedule",
        weekStart,
        weekEnd,
        days,
        generatedAt: new Date().toISOString(),
        callbackReserve: 5,
      },
      performanceMetrics: {
        todayCallsMade: 0,
        todayConnected: 0,
        todayInterested: 0,
        todayVoicemails: 0,
        connectRate: 0,
        interestRate: 0,
        callsPerHour: 0,
        currentStreak: 0,
        bestStreak: 0,
        hourlyData: [],
      },
      callbacks: [],
      auditLog: [],
      config: {
        maxCallsPerDay: 35,
        callbackReservePercent: 15,
        workStartHour: 8.5,
        workEndHour: 16.5,
        lunchStartHour: 12,
        lunchEndHour: 13,
        avgCallCycleMinutes: 7,
        bufferMinutesPerHour: 10,
        connectRateThreshold: 15,
        interestRateThreshold: 5,
        lowVelocityThreshold: 4,
        failureWindowHours: 2,
      },
      weeklyReports: [],
    },
    version: 1,
  };
}

async function injectStores(page: import("@playwright/test").Page) {
  const storeData = buildStoreData();
  const contactIds = storeData.state.contacts.map((c) => c.id);
  const danniaData = buildDanniaStoreData(contactIds);

  await page.evaluate(async ({ outbound, dannia }) => {
    // Inject outbound campaigns store
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
}

async function loginAndOpenDialer(page: import("@playwright/test").Page) {
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

  // Inject both stores
  await injectStores(page);

  // Navigate to outbound campaigns
  await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Enable Dannia Mode
  const toggle = page.locator("button", { hasText: "Dannia Mode" });
  await expect(toggle).toBeVisible({ timeout: 10000 });
  await toggle.click();
  await page.waitForTimeout(3000);
  await expect(page.locator("h1", { hasText: "Dannia Mode" })).toBeVisible({ timeout: 10000 });

  // Wait for START DIALING to be enabled (schedule loads from IDB)
  const startBtn = page.locator("button", { hasText: "START DIALING" });
  await expect(startBtn).toBeEnabled({ timeout: 20000 });

  // Click to start dialer
  await startBtn.click();

  // Wait for PowerDialer to render
  await expect(page.locator("text=Power Dialer")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe("Dannia AI Assist — 3-Layer Real-Time Assistance", () => {
  test.setTimeout(60000);

  test("AgentAssist shows 3 tabs in Dannia Mode dialer", async ({ page }) => {
    await loginAndOpenDialer(page);

    // AgentAssist should show 3 tabs
    await expect(page.locator("button", { hasText: "Quick Answers" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button", { hasText: "Ask AI" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Live Assist" })).toBeVisible();

    // DANNIA badge
    await expect(page.getByText("DANNIA", { exact: true })).toBeVisible();
  });

  test("Quick Answers tab renders contact-aware cards", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Expand AgentAssist if collapsed
    const expandBtn = page.locator("button", { hasText: "AI Agent Assist" });
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }

    // Click Quick Answers tab
    await page.locator("button", { hasText: "Quick Answers" }).click();
    await page.waitForTimeout(1000);

    // Category filter chips
    await expect(page.locator("button", { hasText: /^All \(/ })).toBeVisible({ timeout: 10000 });

    // Pricing reference card
    const pricingCard = page.locator("text=Pricing Quick Reference");
    await expect(pricingCard).toBeVisible({ timeout: 5000 });

    // Expand it
    await pricingCard.click();
    await page.waitForTimeout(1000);

    // Should show pricing content
    await expect(page.locator("text=/\\$275/").first()).toBeVisible({ timeout: 5000 });
  });

  test("Ask AI tab responds to queries with KB match", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Expand AgentAssist if collapsed
    const expandBtn = page.locator("button", { hasText: "AI Agent Assist" });
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to Ask AI tab
    await page.locator("button", { hasText: "Ask AI" }).click();
    await page.waitForTimeout(1000);

    // Quick prompt should be visible
    const prompt = page.locator("button", { hasText: "How much does pumping cost?" });
    await expect(prompt).toBeVisible({ timeout: 5000 });

    // Click it
    await prompt.click();
    await page.waitForTimeout(3000);

    // Should show AI Suggestion response
    await expect(page.locator("text=AI Suggestion").first()).toBeVisible({ timeout: 10000 });
  });

  test("Live Assist tab shows transcription UI", async ({ page }) => {
    await loginAndOpenDialer(page);

    // Expand AgentAssist if collapsed
    const expandBtn = page.locator("button", { hasText: "AI Agent Assist" });
    if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }

    // Switch to Live Assist tab
    await page.locator("button", { hasText: "Live Assist" }).click();
    await page.waitForTimeout(1000);

    // Should show some transcription UI element
    const startBtn = page.locator("button", { hasText: /Start|Stop/ });
    const transcriptionMsg = page.locator("text=transcription");
    const notSupported = page.locator("text=Speech recognition is not supported");

    const hasStart = await startBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasTrans = await transcriptionMsg.first().isVisible({ timeout: 1000 }).catch(() => false);
    const hasNotSup = await notSupported.isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasStart || hasTrans || hasNotSup).toBe(true);
  });

  test("mobile responsive — 3-tab AI panel at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndOpenDialer(page);

    // Expand if collapsed
    const expandBtn = page.locator("button", { hasText: "AI Agent Assist" });
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.locator("button", { hasText: "Quick Answers" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button", { hasText: "Ask AI" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Live Assist" })).toBeVisible();

    const overflows = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflows).toBe(false);
  });
});

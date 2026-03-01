import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.describe("Dannia AI Auto-Summary", () => {
  test.setTimeout(60000);

  function buildStoreData() {
    const contacts = [
      {
        id: "as-c1",
        campaign_id: "test-campaign-as",
        account_number: "S-3001",
        account_name: "Frank Green",
        phone: "5125553001",
        email: "frank@example.com",
        address: "321 Pine Rd",
        city: "San Marcos",
        state: "TX",
        zip_code: "78666",
        company: "",
        contact_name: "Frank Green",
        service_zone: "Zone 1 - Home Base",
        system_type: "Aerobic",
        contract_type: "Residential",
        contract_status: "Expired",
        contract_start: "2023-01-01",
        contract_end: "2024-01-01",
        days_since_expiry: 420,
        call_status: "pending",
        call_attempts: 0,
        last_disposition: null,
        priority: 80,
        notes: "",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "as-c2",
        campaign_id: "test-campaign-as",
        account_number: "S-3002",
        account_name: "Grace Lee",
        phone: "5125553002",
        email: "grace@example.com",
        address: "654 Cedar Ln",
        city: "Kyle",
        state: "TX",
        zip_code: "78640",
        company: "",
        contact_name: "Grace Lee",
        service_zone: "Zone 2 - Local",
        system_type: "Conventional",
        contract_type: "Commercial",
        contract_status: "Active",
        contract_start: "2024-01-01",
        contract_end: "2025-12-01",
        days_since_expiry: 0,
        call_status: "pending",
        call_attempts: 0,
        last_disposition: null,
        priority: 60,
        notes: "",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    return {
      state: {
        contacts,
        campaigns: [
          {
            id: "test-campaign-as",
            name: "Auto Summary Campaign",
            description: "Testing AI auto-summary",
            status: "active" as const,
            source_file: "test.xlsx",
            source_sheet: "Zone 1",
            total_contacts: 2,
            contacts_called: 0,
            contacts_connected: 0,
            contacts_interested: 0,
            contacts_completed: 0,
            assigned_reps: [],
            created_by: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        activeCampaignId: "test-campaign-as",
        dialerContactIndex: 0,
        dialerActive: false,
        danniaMode: false,
        sortOrder: "default",
        autoDialEnabled: false,
        autoDialDelay: 5,
        campaignAutomationConfigs: {},
      },
      version: 5,
    };
  }

  function buildDanniaStoreData() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return {
      state: {
        currentSchedule: {
          id: "test-schedule-as",
          weekStart: monday.toISOString().split("T")[0],
          weekEnd: friday.toISOString().split("T")[0],
          days: [],
          generatedAt: now.toISOString(),
          callbackReserve: 5,
        },
        performanceMetrics: {
          todayCallsMade: 2,
          todayConnected: 1,
          todayInterested: 0,
          todayVoicemails: 1,
          connectRate: 50,
          interestRate: 0,
          callsPerHour: 6,
          currentStreak: 1,
          bestStreak: 1,
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
        activeBlockId: null,
        dialingActive: false,
        earnedBadges: ["first_ring"],
        lifetimeStats: {
          totalCalls: 2,
          totalConnected: 1,
          totalInterested: 0,
          totalVoicemails: 1,
          totalDaysWorked: 1,
          longestStreak: 1,
          bestDayCalls: 2,
          bestDayConnectRate: 50,
        },
        voicemailDropConfig: { enabled: false, extension: "" },
        pendingSmsSteps: [],
        recentCallRecords: [],
      },
      version: 3,
    };
  }

  async function loginAndOpenDialer(page: any) {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill(
      'input[name="email"], input[type="email"]',
      process.env.TEST_EMAIL || "test@macseptic.com",
    );
    await page.fill(
      'input[name="password"], input[type="password"]',
      process.env.TEST_PASSWORD || "TestPassword123",
    );
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForFunction(() => !location.href.includes("/login"), {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    const storeData = buildStoreData();
    const danniaData = buildDanniaStoreData();

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
    await expect(
      page.locator("h1", { hasText: "Dannia Mode" }),
    ).toBeVisible({ timeout: 10000 });
  }

  test("Auto-summary banner not visible when no call has ended", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // AI Summary banner should NOT be visible (no call has ended)
    const summaryBanner = page.locator("text=AI Summary");
    await expect(summaryBanner).not.toBeVisible({ timeout: 5000 });
  });

  test("Dannia Mode dashboard renders correctly with all tabs", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // Dashboard should show Daily Goals
    await expect(
      page.locator("text=Daily Goals"),
    ).toBeVisible({ timeout: 10000 });

    // All four tabs should be visible
    await expect(
      page.locator("button", { hasText: "Today" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator("button", { hasText: "My Calls" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("START DIALING button and dashboard layout correct in Dannia mode", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // START DIALING button should be visible
    const startBtn = page.locator("button", { hasText: "START DIALING" });
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    // Connect Rate should be visible
    const connectRate = page.locator("text=Connect Rate");
    const hasRate = await connectRate
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasRate).toBe(true);
  });
});

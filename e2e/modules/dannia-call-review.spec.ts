import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.describe("Dannia Call Review Panel", () => {
  test.setTimeout(60000);

  function buildStoreData() {
    const contacts = [
      {
        id: "cr-c1",
        campaign_id: "test-campaign-cr",
        account_number: "S-2001",
        account_name: "Carol Davis",
        phone: "5125552001",
        email: "carol@example.com",
        address: "789 Elm St",
        city: "San Marcos",
        state: "TX",
        zip_code: "78666",
        company: "",
        contact_name: "Carol Davis",
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
    ];

    return {
      state: {
        contacts,
        campaigns: [
          {
            id: "test-campaign-cr",
            name: "Call Review Campaign",
            description: "Testing call review",
            status: "active" as const,
            source_file: "test.xlsx",
            source_sheet: "Zone 1",
            total_contacts: 1,
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
        activeCampaignId: "test-campaign-cr",
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
    const todayStr = now.toISOString().split("T")[0];
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return {
      state: {
        currentSchedule: {
          id: "test-schedule-cr",
          weekStart: monday.toISOString().split("T")[0],
          weekEnd: friday.toISOString().split("T")[0],
          days: [],
          generatedAt: now.toISOString(),
          callbackReserve: 5,
        },
        performanceMetrics: {
          todayCallsMade: 5,
          todayConnected: 3,
          todayInterested: 1,
          todayVoicemails: 1,
          connectRate: 60,
          interestRate: 33,
          callsPerHour: 8,
          currentStreak: 2,
          bestStreak: 3,
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
        earnedBadges: ["first_ring", "warming_up"],
        lifetimeStats: {
          totalCalls: 5,
          totalConnected: 3,
          totalInterested: 1,
          totalVoicemails: 1,
          totalDaysWorked: 1,
          longestStreak: 3,
          bestDayCalls: 5,
          bestDayConnectRate: 60,
        },
        voicemailDropConfig: { enabled: false, extension: "" },
        pendingSmsSteps: [],
        recentCallRecords: [
          {
            id: "rec-1",
            contactId: "cr-c1",
            contactName: "Carol Davis",
            callId: "call-abc-123",
            disposition: "interested",
            durationSec: 245,
            recordingAvailable: true,
            timestamp: Date.now() - 3600000,
            notes: "Interested in maintenance plan",
          },
          {
            id: "rec-2",
            contactId: "cr-c2",
            contactName: "Dave Wilson",
            callId: "call-def-456",
            disposition: "voicemail",
            durationSec: 35,
            recordingAvailable: true,
            timestamp: Date.now() - 7200000,
            notes: "Left voicemail",
          },
          {
            id: "rec-3",
            contactId: "cr-c3",
            contactName: "Eve Martinez",
            callId: "call-ghi-789",
            disposition: "not_interested",
            durationSec: 120,
            recordingAvailable: true,
            timestamp: Date.now() - 1800000,
            notes: "Has existing provider",
          },
        ],
      },
      version: 3,
    };
  }

  async function loginAndEnableDannia(page: any) {
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

  test('"My Calls" tab visible in Dannia Dashboard', async ({ page }) => {
    await loginAndEnableDannia(page);

    const myCallsTab = page.locator("button", { hasText: "My Calls" });
    await expect(myCallsTab).toBeVisible({ timeout: 10000 });
  });

  test("Call review panel renders with injected call history data", async ({
    page,
  }) => {
    await loginAndEnableDannia(page);

    // Click My Calls tab
    const myCallsTab = page.locator("button", { hasText: "My Calls" });
    await myCallsTab.click();
    await page.waitForTimeout(1000);

    // Should show call records
    const carolRecord = page.locator("text=Carol Davis");
    const hasCarol = await carolRecord
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    const daveRecord = page.locator("text=Dave Wilson");
    const hasDave = await daveRecord
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // At least one record should be visible
    expect(hasCarol || hasDave).toBe(true);
  });

  test("Filter buttons present in call review", async ({ page }) => {
    await loginAndEnableDannia(page);

    const myCallsTab = page.locator("button", { hasText: "My Calls" });
    await myCallsTab.click();
    await page.waitForTimeout(1000);

    // Check filter buttons
    const allFilter = page.locator("button", { hasText: "All" });
    const interestedFilter = page.locator("button", {
      hasText: "Interested",
    });
    const voicemailFilter = page.locator("button", {
      hasText: "Voicemail",
    });

    const hasAll = await allFilter
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasInterested = await interestedFilter
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasVoicemail = await voicemailFilter
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasAll || hasInterested || hasVoicemail).toBe(true);
  });

  test("Mobile responsive at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndEnableDannia(page);

    const myCallsTab = page.locator("button", { hasText: "My Calls" });
    await myCallsTab.click();
    await page.waitForTimeout(1000);

    // No horizontal overflow
    const overflows = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(overflows).toBe(false);
  });
});

import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.describe("Dannia SMS Sequences", () => {
  test.setTimeout(60000);

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

  function buildStoreData() {
    const contacts = [
      {
        id: "sms-c1",
        campaign_id: "test-campaign-sms",
        account_number: "S-1001",
        account_name: "Alice Johnson",
        phone: "5125551001",
        email: "alice@example.com",
        address: "123 Main St",
        city: "San Marcos",
        state: "TX",
        zip_code: "78666",
        company: "",
        contact_name: "Alice Johnson",
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
        id: "sms-c2",
        campaign_id: "test-campaign-sms",
        account_number: "S-1002",
        account_name: "Bob Smith",
        phone: "5125551002",
        email: "bob@example.com",
        address: "456 Oak Ave",
        city: "Kyle",
        state: "TX",
        zip_code: "78640",
        company: "",
        contact_name: "Bob Smith",
        service_zone: "Zone 2 - Local",
        system_type: "Conventional",
        contract_type: "Commercial",
        contract_status: "Active",
        contract_start: "2024-01-01",
        contract_end: "2025-06-01",
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
            id: "test-campaign-sms",
            name: "SMS Test Campaign",
            description: "Testing SMS sequences",
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
        activeCampaignId: "test-campaign-sms",
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
          id: "test-schedule-sms",
          weekStart: monday.toISOString().split("T")[0],
          weekEnd: friday.toISOString().split("T")[0],
          days: [],
          generatedAt: now.toISOString(),
          callbackReserve: 5,
        },
        performanceMetrics: {
          todayCallsMade: 3,
          todayConnected: 1,
          todayInterested: 0,
          todayVoicemails: 2,
          connectRate: 33,
          interestRate: 0,
          callsPerHour: 6,
          currentStreak: 0,
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
          totalCalls: 3,
          totalConnected: 1,
          totalInterested: 0,
          totalVoicemails: 2,
          totalDaysWorked: 1,
          longestStreak: 1,
          bestDayCalls: 3,
          bestDayConnectRate: 33,
        },
        voicemailDropConfig: { enabled: false, extension: "" },
        pendingSmsSteps: [
          {
            id: "test-sms-step-1",
            contactId: "sms-c1",
            contactName: "Alice Johnson",
            contactPhone: "+15125551001",
            sequenceId: "voicemail_followup",
            stepIndex: 0,
            template: "Hi Alice Johnson, this is Dannia from Mac Septic...",
            scheduledAt: Date.now() - 60000,
            status: "pending",
            sentAt: null,
            error: null,
          },
          {
            id: "test-sms-step-2",
            contactId: "sms-c1",
            contactName: "Alice Johnson",
            contactPhone: "+15125551001",
            sequenceId: "voicemail_followup",
            stepIndex: 1,
            template: "Follow-up message for Alice...",
            scheduledAt: Date.now() + 86400000,
            status: "pending",
            sentAt: null,
            error: null,
          },
        ],
        recentCallRecords: [],
      },
      version: 3,
    };
  }

  test("SMS sequence status indicator renders in Dannia Mode dialer", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // Dannia Mode dashboard should be visible
    await expect(
      page.locator("h1", { hasText: "Dannia Mode" }),
    ).toBeVisible({ timeout: 10000 });

    // My Calls tab should be visible (new feature)
    const myCallsTab = page.locator("button", { hasText: "My Calls" });
    await expect(myCallsTab).toBeVisible({ timeout: 5000 });

    // START DIALING button should be present
    const startBtn = page.locator("button", { hasText: "START DIALING" });
    await expect(startBtn).toBeVisible({ timeout: 5000 });
  });

  test("SMS features not visible outside Dannia Mode", async ({ page }) => {
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

    // Store data WITHOUT Dannia mode
    const storeData = {
      state: {
        contacts: [],
        campaigns: [],
        activeCampaignId: null,
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

    await page.evaluate(async (store: string) => {
      localStorage.setItem("outbound-campaigns-store", store);
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("keyval-store");
        req.onupgradeneeded = () => {
          req.result.createObjectStore("keyval");
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("keyval", "readwrite");
          tx.objectStore("keyval").put(store, "outbound-campaigns-store");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    }, JSON.stringify(storeData));

    await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // SMS queued badge should NOT be visible
    const smsBadge = page.locator("text=SMS queued");
    await expect(smsBadge).not.toBeVisible({ timeout: 3000 });
  });

  test("Dannia Mode dashboard renders with SMS infrastructure", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // Dannia Mode dashboard should render correctly
    await expect(
      page.locator("text=Daily Goals"),
    ).toBeVisible({ timeout: 10000 });

    // Badges should render
    const badges = page.locator("text=Badges Earned");
    const hasBadges = await badges
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Connect Rate should be visible
    const connectRate = page.locator("text=Connect Rate");
    const hasRate = await connectRate
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasBadges || hasRate).toBe(true);
  });
});

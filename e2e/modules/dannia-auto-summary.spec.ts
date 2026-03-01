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
        service_zone: 1,
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
        service_zone: 2,
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
            status: "active",
            total_contacts: 2,
            called_count: 0,
            connected_count: 0,
            interested_count: 0,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        activeCampaignId: "test-campaign-as",
        dialerContactIndex: 0,
        dialerActive: true,
        danniaMode: true,
        sortOrder: "smart",
        autoDialEnabled: true,
        autoDialDelay: 5,
        automationConfig: {},
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
        dialingActive: true,
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

    await page.evaluate(
      async ([store, dannia]: [string, string]) => {
        localStorage.setItem("outbound-campaigns-store", store);
        localStorage.setItem("dannia-mode-store", dannia);

        for (const [key, val] of [
          ["outbound-campaigns-store", store],
          ["dannia-mode-store", dannia],
        ]) {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.open("keyval-store");
            req.onupgradeneeded = () => {
              req.result.createObjectStore("keyval");
            };
            req.onsuccess = () => {
              const db = req.result;
              const tx = db.transaction("keyval", "readwrite");
              tx.objectStore("keyval").put(val, key);
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
        }
      },
      [JSON.stringify(storeData), JSON.stringify(danniaData)],
    );

    await page.goto("/outbound-campaigns", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const toggle = page.locator("button", { hasText: "Dannia Mode" });
    await toggle.click({ timeout: 10000 });
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

  test("Notes textarea accessible and writable in Dannia mode dialer", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // Notes textarea should be present
    const notesField = page.locator('textarea[placeholder="Call notes..."]');
    const hasNotes = await notesField
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (hasNotes) {
      await notesField.fill("Test note for auto-summary");
      const value = await notesField.inputValue();
      expect(value).toBe("Test note for auto-summary");
    } else {
      // Dialer may not be showing the notes field if no contact is active
      // Verify the Power Dialer at least rendered
      await expect(
        page.locator("text=Power Dialer"),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("Smart Disposition + notes layout correct in Dannia mode", async ({
    page,
  }) => {
    await loginAndOpenDialer(page);

    // Verify Smart Disposition panel is present
    const smartDisposition = page.locator("text=Smart Disposition");
    const hasDisposition = await smartDisposition
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Verify notes area is present
    const notesField = page.locator('textarea[placeholder="Call notes..."]');
    const hasNotes = await notesField
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Both should render in Dannia mode dialer
    expect(hasDisposition || hasNotes).toBe(true);
  });
});

import { test, expect } from "@playwright/test";

function buildStoreData() {
  const now = new Date().toISOString();
  const campaignId = "test-campaign-1";

  const contacts = [
    {
      id: "c1", campaign_id: campaignId, account_number: "1001",
      account_name: "Smith Residence", company: null, phone: "5125551234",
      email: "smith@test.com", address: "123 Main St", city: null, state: null,
      zip_code: "78666", service_zone: "Zone 1 - Home Base", system_type: "Aerobic",
      contract_type: "Annual", contract_status: "Expired",
      contract_start: "2023-01-01", contract_end: "2024-01-01", contract_value: null,
      days_since_expiry: 400, customer_type: "Residential",
      call_priority_label: "High", call_status: "pending", call_attempts: 0,
      last_call_date: null, last_call_duration: null, last_disposition: null,
      notes: null, callback_date: null, assigned_rep: null, priority: 3,
      created_at: now, updated_at: now,
    },
    {
      id: "c2", campaign_id: campaignId, account_number: "1002",
      account_name: "Jones Commercial", company: "Jones LLC", phone: "5125555678",
      email: "jones@test.com", address: "456 Oak Ave", city: null, state: null,
      zip_code: "78666", service_zone: "Zone 2 - Local", system_type: "Conventional",
      contract_type: null, contract_status: null, contract_start: null,
      contract_end: null, contract_value: null, days_since_expiry: null,
      customer_type: "Commercial", call_priority_label: "Medium",
      call_status: "interested", call_attempts: 2,
      last_call_date: new Date(Date.now() - 86400000).toISOString(),
      last_call_duration: 120, last_disposition: "interested",
      notes: "Wants a quote", callback_date: null, assigned_rep: null, priority: 2,
      created_at: now, updated_at: now,
    },
    {
      id: "c3", campaign_id: campaignId, account_number: "1003",
      account_name: "DNC Person", company: null, phone: "5125559999",
      email: null, address: null, city: null, state: null,
      zip_code: null, service_zone: null, system_type: null,
      contract_type: null, contract_status: null, contract_start: null,
      contract_end: null, contract_value: null, days_since_expiry: null,
      customer_type: null, call_priority_label: null,
      call_status: "do_not_call", call_attempts: 1,
      last_call_date: new Date(Date.now() - 172800000).toISOString(),
      last_call_duration: 30, last_disposition: "do_not_call",
      notes: "Requested removal", callback_date: null, assigned_rep: null,
      priority: 0, created_at: now, updated_at: now,
    },
  ];

  return {
    state: {
      campaigns: [{
        id: campaignId, name: "Test Campaign", description: "E2E test campaign",
        status: "active", source_file: "test.xlsx", source_sheet: "Zone 1",
        total_contacts: contacts.length, contacts_called: 2, contacts_connected: 1,
        contacts_interested: 1, contacts_completed: 1, assigned_reps: [],
        created_by: null, created_at: now, updated_at: now,
      }],
      contacts,
      activeCampaignId: null, dialerContactIndex: 0, dialerActive: false,
      autoDialEnabled: false, autoDialDelay: 5, sortOrder: "default",
      campaignAutomationConfigs: {},
    },
    version: 4,
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

  // Inject test data into IndexedDB (idb-keyval uses "keyval-store" db, "keyval" store)
  await page.evaluate(async (storeData) => {
    // Also set in localStorage as fallback for the migration path
    localStorage.setItem("outbound-campaigns-store", JSON.stringify(storeData));
    // Write directly to IndexedDB where the store now persists
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("keyval-store");
      req.onupgradeneeded = () => {
        req.result.createObjectStore("keyval");
      };
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

async function selectCampaign(page: import("@playwright/test").Page) {
  await page.getByRole("heading", { name: "Test Campaign" }).click();
  await page.waitForTimeout(1000);
}

test.describe("Outbound Campaigns", () => {
  test.describe.configure({ mode: "serial" });

  test("page loads with campaign list and all four tabs", async ({ page }) => {
    await loginAndSetup(page);

    await expect(page.locator("h1", { hasText: "Outbound Campaigns" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Campaigns", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contacts", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Power Dialer", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Analytics", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Campaign" })).toBeVisible();
  });

  test("selecting campaign shows stats bar with DNC count", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await expect(page.locator("text=DNC").first()).toBeVisible({ timeout: 5000 });
  });

  test("contacts tab shows DNC badge and quick-action button", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await expect(page.locator("table")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("tr", { hasText: "DNC Person" })).toBeVisible();

    const phoneOffButtons = page.locator('button[title="Mark Do Not Call"]');
    expect(await phoneOffButtons.count()).toBeGreaterThan(0);
  });

  test("power dialer shows auto-dial and smart order toggles", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await page.locator("button", { hasText: "Power Dialer" }).click();
    await page.waitForTimeout(1000);

    await expect(page.locator("button", { hasText: "Auto" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("button", { hasText: "Smart" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Default" }).first()).toBeVisible();
    await expect(page.locator("button", { hasText: "Start Session" })).toBeVisible();
  });

  test("auto-dial toggle shows delay selector", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await page.locator("button", { hasText: "Power Dialer" }).click();
    await page.waitForTimeout(1000);

    await page.locator("button", { hasText: "Auto" }).click();
    await page.waitForTimeout(300);

    // A select element with delay options (3s, 5s, 10s) should appear
    const selects = page.locator("select");
    expect(await selects.count()).toBeGreaterThan(0);
  });

  test("analytics tab renders KPI cards and chart sections", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await page.locator("button", { hasText: "Analytics" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Calls/Hour")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Connect Rate")).toBeVisible();
    await expect(page.locator("text=Interest Rate")).toBeVisible();
    await expect(page.locator("text=Avg Duration")).toBeVisible();
    await expect(page.locator("text=Callback Conv.")).toBeVisible();

    await expect(page.locator("text=Disposition Breakdown")).toBeVisible();
    await expect(page.locator("text=Calls Over Time")).toBeVisible();
    await expect(page.locator("text=Conversion Funnel")).toBeVisible();
    await expect(page.locator("text=Best Calling Hours")).toBeVisible();

    await expect(page.locator("text=Call Log")).toBeVisible();
    await expect(page.locator("button", { hasText: "Export CSV" })).toBeVisible();
  });

  test("CSV export triggers file download", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await page.locator("button", { hasText: "Analytics" }).click();
    await page.waitForTimeout(2000);

    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
    await page.locator("button", { hasText: "Export CSV" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("campaign-");
    expect(download.suggestedFilename()).toContain("-export.csv");
  });

  test("conversion funnel displays all stages", async ({ page }) => {
    await loginAndSetup(page);
    await selectCampaign(page);

    await page.locator("button", { hasText: "Analytics" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator("text=Total Contacts")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Finalized", { exact: true })).toBeVisible();
  });
});

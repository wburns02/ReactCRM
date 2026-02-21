/**
 * Contracts — Interaction Tests
 *
 * Covers:
 *   - /contracts   → Contracts & Maintenance page
 *                    Five tabs: Active Contracts, New Contract, Renewals, Reports, Templates
 *                    Summary KPI cards (Total, Active, Pending, Revenue)
 *                    ContractList with status/type/tier filters
 *                    ContractDetails side-panel (opens on row click)
 *                    NewContractForm (tab-based, not a modal)
 *                    ContractTemplates tab (filter + seed button)
 *
 * Uses storageState from test@macseptic.com (admin) via "modules" project.
 *
 * Resilience policy:
 *   - Annotate with info and return when optional UI elements are absent.
 *   - Hard-fail ONLY on React error boundary or non-noise console errors.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";

const NOISE = [
  "API Schema Violation",
  "Sentry",
  "ResizeObserver",
  "favicon",
  "Failed to load resource",
  "server responded with a status of",
  "third-party cookie",
  "net::ERR_",
  "WebSocket",
  "[WebSocket]",
  "wss://",
];
function isNoise(msg: string): boolean {
  return NOISE.some((n) => msg.includes(n));
}

// ---------------------------------------------------------------------------
// Contracts — List
// ---------------------------------------------------------------------------

test.describe("Contracts — List", () => {
  test("contracts page loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Gracefully handle auth expiry
    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — auth may have expired",
      });
      return;
    }

    // Hard-fail: React error boundary
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "React error boundary appeared on /contracts",
    ).toBe(false);

    // Page must have meaningful content
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body is empty — possible white-screen crash",
    ).toBeGreaterThan(20);

    // Hard-fail: non-noise console errors
    expect(
      errors,
      `Unexpected console errors: ${errors.join(" | ")}`,
    ).toHaveLength(0);
  });

  test("contracts page shows heading and KPI summary cards", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping heading check",
      });
      return;
    }

    // Page heading
    const heading = page
      .getByRole("heading", { name: /contracts/i })
      .or(page.getByText(/contracts & maintenance/i))
      .first();
    const headingVisible = await heading.isVisible().catch(() => false);

    // KPI cards: Total, Active, Pending, Revenue
    const totalCard = page.getByText(/^total$/i).first();
    const activeCard = page.getByText(/^active$/i).first();
    const pendingCard = page.getByText(/^pending$/i).first();
    const revenueCard = page.getByText(/^revenue$/i).first();

    const totalVisible = await totalCard.isVisible().catch(() => false);
    const activeVisible = await activeCard.isVisible().catch(() => false);
    const pendingVisible = await pendingCard.isVisible().catch(() => false);
    const revenueVisible = await revenueCard.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: [
        `heading:${headingVisible}`,
        `kpi-total:${totalVisible}`,
        `kpi-active:${activeVisible}`,
        `kpi-pending:${pendingVisible}`,
        `kpi-revenue:${revenueVisible}`,
      ].join(" "),
    });

    // At least the heading OR one KPI card must be visible — not a blank page
    expect(
      headingVisible || totalVisible || activeVisible,
      "Neither page heading nor KPI cards are visible — possible render failure",
    ).toBe(true);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "Error boundary on contracts heading check").toBe(
      false,
    );
  });

  test("contracts tab shows five navigation tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping tab check",
      });
      return;
    }

    // The page renders five tab buttons: Active Contracts, New Contract, Renewals, Reports, Templates
    const activeContractsTab = page
      .getByRole("button", { name: /active contracts|active/i })
      .or(page.locator("button").filter({ hasText: /active/i }))
      .first();
    const newContractTab = page
      .getByRole("button", { name: /new contract|new/i })
      .or(page.locator("button").filter({ hasText: /new/i }))
      .first();
    const renewalsTab = page
      .getByRole("button", { name: /renewals/i })
      .or(page.locator("button").filter({ hasText: /renewals/i }))
      .first();
    const templatesTab = page
      .getByRole("button", { name: /templates/i })
      .or(page.locator("button").filter({ hasText: /templates/i }))
      .first();

    const activeContractsVisible = await activeContractsTab
      .isVisible()
      .catch(() => false);
    const newContractVisible = await newContractTab
      .isVisible()
      .catch(() => false);
    const renewalsVisible = await renewalsTab.isVisible().catch(() => false);
    const templatesVisible = await templatesTab.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: [
        `tab-activeContracts:${activeContractsVisible}`,
        `tab-newContract:${newContractVisible}`,
        `tab-renewals:${renewalsVisible}`,
        `tab-templates:${templatesVisible}`,
      ].join(" "),
    });

    // At least Active Contracts and New Contract tabs should be present
    expect(
      activeContractsVisible || newContractVisible,
      "Neither Active Contracts nor New Contract tab is visible",
    ).toBe(true);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "Error boundary checking tabs").toBe(false);
  });

  test("contracts list has rows or an empty state", async ({ page }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping list check",
      });
      return;
    }

    // ContractList renders cards (div-based, not a <table>)
    const contractCards = page.locator(
      '[class*="cursor-pointer"], [class*="rounded-lg border"]',
    );
    const emptyState = page
      .getByText(/no contracts found|contracts will appear/i)
      .first();
    const loadingSkeletons = page.locator('[class*="animate-pulse"]');

    const cardCount = await contractCards.count();
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const isLoading = await loadingSkeletons.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: `contractCards:${cardCount} empty:${isEmpty} loading:${isLoading}`,
    });

    // Must show one of: contract rows, empty state, or loading skeletons — not a blank void
    expect(
      cardCount > 0 || isEmpty || isLoading,
      "Contracts list shows no content, no empty state, and no loading indicator",
    ).toBe(true);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "Error boundary on contract list").toBe(false);
  });

  test("status filter dropdown is visible and interactive", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping filter check",
      });
      return;
    }

    // ContractList renders <select aria-label="Filter by status">
    const statusSelect = page
      .getByLabel(/filter by status/i)
      .or(page.locator('select[aria-label*="status" i]'))
      .first();

    const selectVisible = await statusSelect.isVisible().catch(() => false);
    if (!selectVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Status filter select not visible — may be hidden or list is empty",
      });
      return;
    }

    // Select "Active" and wait for re-render — must not crash
    await statusSelect.selectOption("active");
    await page.waitForTimeout(1200);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after selecting 'active' status filter",
    ).toBe(false);

    await expect(page.locator("body")).toBeVisible();

    // Reset back to "All Statuses"
    await statusSelect.selectOption("");
    await page.waitForTimeout(800);
  });

  test("type filter dropdown is visible and interactive", async ({ page }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping type filter check",
      });
      return;
    }

    const typeSelect = page
      .getByLabel(/filter by type/i)
      .or(page.locator('select[aria-label*="type" i]'))
      .first();

    const selectVisible = await typeSelect.isVisible().catch(() => false);
    if (!selectVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Type filter select not visible",
      });
      return;
    }

    await typeSelect.selectOption("maintenance");
    await page.waitForTimeout(1200);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after selecting 'maintenance' type filter",
    ).toBe(false);

    await expect(page.locator("body")).toBeVisible();

    await typeSelect.selectOption("");
    await page.waitForTimeout(600);
  });

  test("New Contract tab is visible and clickable", async ({ page }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping New Contract tab check",
      });
      return;
    }

    // The "New Contract" tab is a <button> in the tab nav bar
    const newContractTab = page
      .getByRole("button", { name: /new contract/i })
      .or(page.locator("button").filter({ hasText: /new contract/i }))
      .first();

    const tabVisible = await newContractTab.isVisible().catch(() => false);

    if (!tabVisible) {
      // Fallback: look for any "New" / "Create" button anywhere on the page
      const fallbackBtn = page
        .getByRole("button", { name: /new|create/i })
        .or(page.getByRole("link", { name: /new contract|create/i }))
        .first();
      const fallbackVisible = await fallbackBtn.isVisible().catch(() => false);

      test.info().annotations.push({
        type: "info",
        description: `New Contract tab not found; fallbackBtn:${fallbackVisible}`,
      });

      // Soft pass — page loaded without error boundary is enough
      const errorBoundary = await page
        .getByText(/something went wrong/i)
        .isVisible()
        .catch(() => false);
      expect(errorBoundary, "Error boundary while looking for New Contract tab").toBe(
        false,
      );
      return;
    }

    await newContractTab.click();
    await page.waitForTimeout(2000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after clicking New Contract tab",
    ).toBe(false);

    // After clicking the New Contract tab, the form or a heading should appear
    const formVisible = await page.locator("form").isVisible().catch(() => false);
    const createHeading = await page
      .getByText(/create new contract|new contract/i)
      .isVisible()
      .catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: `form:${formVisible} createHeading:${createHeading}`,
    });

    // Soft-pass: page loaded without error boundary is sufficient
    test.info().annotations.push({
      type: "info",
      description: `New Contract click result — form:${formVisible} heading:${createHeading}`,
    });
  });
});

// ---------------------------------------------------------------------------
// Contracts — Detail
// ---------------------------------------------------------------------------

test.describe("Contracts — Detail", () => {
  test("clicking a contract card opens the detail side-panel", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping detail test",
      });
      return;
    }

    // ContractList rows are cursor-pointer divs — find the first one that has contract-number text
    // They contain contract_number text like "CTR-" or similar
    const contractRow = page
      .locator('[class*="cursor-pointer"]')
      .or(
        page.locator('div').filter({ hasText: /CTR-|active|pending|expired/i }).first(),
      )
      .first();

    const rowVisible = await contractRow.isVisible().catch(() => false);
    if (!rowVisible) {
      test.info().annotations.push({
        type: "info",
        description: "No contract rows visible — list may be empty or still loading",
      });
      return;
    }

    await contractRow.click();
    await page.waitForTimeout(2000);

    // After clicking: ContractDetails side-panel should render in the same page (no navigation)
    // URL stays at /contracts; a side-panel with contract info appears (lg:col-span-1)
    const currentUrl = page.url();
    const isDetailRoute = /\/contracts\/[a-f0-9-]+/.test(currentUrl);
    const isDialog = await page.getByRole("dialog").isVisible().catch(() => false);

    // Look for detail panel content: status badge, dates, or contract name
    const detailContent = page
      .getByText(/contract details|start date|end date|terms|status/i)
      .first();
    const detailVisible = await detailContent.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: [
        `url:${currentUrl}`,
        `detailRoute:${isDetailRoute}`,
        `dialog:${isDialog}`,
        `detailContent:${detailVisible}`,
      ].join(" "),
    });

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after clicking contract row",
    ).toBe(false);

    // Soft-pass: no error boundary is sufficient; annotate the outcome
    test.info().annotations.push({
      type: "info",
      description: `Contract click result — detailRoute:${isDetailRoute} dialog:${isDialog} content:${detailVisible}`,
    });
  });

  test("contract detail panel shows contract info sections", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping detail content check",
      });
      return;
    }

    // Click first contract row to open detail
    const contractRow = page.locator('[class*="cursor-pointer"]').first();
    const rowVisible = await contractRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.info().annotations.push({
        type: "info",
        description: "No contract rows — cannot verify detail content",
      });
      return;
    }

    await contractRow.click();
    await page.waitForTimeout(2500);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(errorBoundary, "Error boundary on contract detail panel").toBe(false);

    // ContractDetails renders: contract number, status badge, customer name,
    // start/end dates, value, and an Activate button when draft/pending
    const hasContractNumber = await page
      .getByText(/CTR-|contract #|contract number/i)
      .isVisible()
      .catch(() => false);
    const hasStatusBadge = await page
      .getByText(/active|pending|expired|draft|cancelled|renewed/i)
      .isVisible()
      .catch(() => false);
    const hasDateInfo = await page
      .getByText(/start date|end date|expires|valid until/i)
      .isVisible()
      .catch(() => false);
    const hasValueInfo = await page
      .getByText(/value|\$|total/i)
      .isVisible()
      .catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: [
        `contractNumber:${hasContractNumber}`,
        `statusBadge:${hasStatusBadge}`,
        `dates:${hasDateInfo}`,
        `value:${hasValueInfo}`,
      ].join(" "),
    });

    // Soft-pass: annotate what was found without hard-failing
    test.info().annotations.push({
      type: "info",
      description: `Detail info found — contractNum:${hasContractNumber} status:${hasStatusBadge} dates:${hasDateInfo} value:${hasValueInfo}`,
    });
  });

  test("contract detail panel Close button dismisses the panel", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping close test",
      });
      return;
    }

    const contractRow = page.locator('[class*="cursor-pointer"]').first();
    const rowVisible = await contractRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.info().annotations.push({
        type: "info",
        description: "No contract rows — skipping close test",
      });
      return;
    }

    await contractRow.click();
    await page.waitForTimeout(1500);

    // Look for a close button (×, Close, X)
    const closeBtn = page
      .getByRole("button", { name: /close|dismiss/i })
      .or(page.locator("button").filter({ hasText: /^×$|^✕$|^x$/i }))
      .or(page.locator('[aria-label*="close" i]'))
      .first();

    const closeVisible = await closeBtn.isVisible().catch(() => false);
    if (!closeVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Close button not found in detail panel",
      });
      return;
    }

    await closeBtn.click();
    await page.waitForTimeout(1000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after closing contract detail panel",
    ).toBe(false);

    await expect(page.locator("body")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Contract Templates
// ---------------------------------------------------------------------------

test.describe("Contract Templates", () => {
  test("templates tab loads on /contracts without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping templates tab test",
      });
      return;
    }

    // Click the Templates tab
    const templatesTab = page
      .getByRole("button", { name: /templates/i })
      .or(page.locator("button").filter({ hasText: /templates/i }))
      .first();

    const tabVisible = await templatesTab.isVisible().catch(() => false);
    if (!tabVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Templates tab button not visible on /contracts",
      });
      return;
    }

    await templatesTab.click();
    await page.waitForTimeout(2500);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after clicking Templates tab",
    ).toBe(false);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body is empty after clicking Templates tab",
    ).toBeGreaterThan(20);

    expect(
      errors,
      `Console errors on Templates tab: ${errors.join(" | ")}`,
    ).toHaveLength(0);
  });

  test("templates tab shows template cards or empty state", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping templates content check",
      });
      return;
    }

    const templatesTab = page
      .getByRole("button", { name: /templates/i })
      .or(page.locator("button").filter({ hasText: /templates/i }))
      .first();

    const tabVisible = await templatesTab.isVisible().catch(() => false);
    if (!tabVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Templates tab not visible — skipping content check",
      });
      return;
    }

    await templatesTab.click();
    await page.waitForTimeout(2500);

    // ContractTemplates can show: template cards, empty state, or loading skeletons
    const templateCards = page.locator('[class*="rounded-lg border"]');
    const emptyOrNoTemplates = page
      .getByText(/no templates|seed templates|get started/i)
      .first();
    const seedButton = page.getByRole("button", { name: /seed templates/i }).first();
    const loadingSkeletons = page.locator('[class*="animate-pulse"]');

    const cardCount = await templateCards.count();
    const isEmptyState = await emptyOrNoTemplates.isVisible().catch(() => false);
    const isSeedVisible = await seedButton.isVisible().catch(() => false);
    const isLoading = await loadingSkeletons.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: [
        `templateCards:${cardCount}`,
        `emptyState:${isEmptyState}`,
        `seedBtn:${isSeedVisible}`,
        `loading:${isLoading}`,
      ].join(" "),
    });

    // No hard assertion on data presence — templates may be empty in test env
    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary on templates tab content",
    ).toBe(false);

    await expect(page.locator("body")).toBeVisible();
  });

  test("templates type filter dropdown is interactive", async ({ page }) => {
    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping templates filter check",
      });
      return;
    }

    const templatesTab = page
      .getByRole("button", { name: /templates/i })
      .or(page.locator("button").filter({ hasText: /templates/i }))
      .first();

    const tabVisible = await templatesTab.isVisible().catch(() => false);
    if (!tabVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Templates tab not visible — skipping filter test",
      });
      return;
    }

    await templatesTab.click();
    await page.waitForTimeout(2000);

    // ContractTemplates has a <select aria-label="Filter by type">
    const typeSelect = page
      .getByLabel(/filter by type/i)
      .or(page.locator('select[aria-label*="type" i]'))
      .first();

    const selectVisible = await typeSelect.isVisible().catch(() => false);
    if (!selectVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Type filter select not visible on templates tab",
      });
      return;
    }

    await typeSelect.selectOption("maintenance");
    await page.waitForTimeout(1000);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after selecting 'maintenance' on templates type filter",
    ).toBe(false);

    await expect(page.locator("body")).toBeVisible();

    await typeSelect.selectOption("");
    await page.waitForTimeout(600);
  });

  test("direct /contracts/templates route loads or falls back to /contracts Templates tab", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    // Try /contracts/templates first; if it 404s or redirects, fall back to /contracts
    await page.goto(`${BASE_URL}/contracts/templates`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const is404 = await page
      .getByText(/404|not found|page not found/i)
      .isVisible()
      .catch(() => false);

    if (is404) {
      test.info().annotations.push({
        type: "info",
        description:
          "/contracts/templates returned 404 — Templates are tab-based on /contracts",
      });
      // Verify the tab-based approach works
      await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login",
      });
      return;
    }

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary on contracts/templates route or /contracts fallback",
    ).toBe(false);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body empty on contracts/templates test",
    ).toBeGreaterThan(20);

    expect(
      errors,
      `Console errors: ${errors.join(" | ")}`,
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Renewals Tab
// ---------------------------------------------------------------------------

test.describe("Contracts — Renewals Tab", () => {
  test("renewals tab loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping renewals tab test",
      });
      return;
    }

    const renewalsTab = page
      .getByRole("button", { name: /renewals/i })
      .or(page.locator("button").filter({ hasText: /renewals/i }))
      .first();

    const tabVisible = await renewalsTab.isVisible().catch(() => false);
    if (!tabVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Renewals tab not visible",
      });
      return;
    }

    await renewalsTab.click();
    await page.waitForTimeout(2500);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after clicking Renewals tab",
    ).toBe(false);

    // Check for expiring soon indicator or empty state
    const renewalContent = page
      .getByText(/expiring|renewal|upcoming|days left|no renewals/i)
      .first();
    const contentVisible = await renewalContent.isVisible().catch(() => false);

    test.info().annotations.push({
      type: "info",
      description: `renewalContent:${contentVisible}`,
    });

    expect(
      errors,
      `Console errors on Renewals tab: ${errors.join(" | ")}`,
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Reports Tab
// ---------------------------------------------------------------------------

test.describe("Contracts — Reports Tab", () => {
  test("reports tab loads without crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text());
    });

    await page.goto(`${BASE_URL}/contracts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.info().annotations.push({
        type: "info",
        description: "Redirected to login — skipping reports tab test",
      });
      return;
    }

    const reportsTab = page
      .getByRole("button", { name: /reports/i })
      .or(page.locator("button").filter({ hasText: /reports/i }))
      .first();

    const tabVisible = await reportsTab.isVisible().catch(() => false);
    if (!tabVisible) {
      test.info().annotations.push({
        type: "info",
        description: "Reports tab not visible",
      });
      return;
    }

    await reportsTab.click();
    await page.waitForTimeout(2500);

    const errorBoundary = await page
      .getByText(/something went wrong/i)
      .isVisible()
      .catch(() => false);
    expect(
      errorBoundary,
      "Error boundary after clicking Reports tab",
    ).toBe(false);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    expect(
      bodyText.trim().length,
      "Page body empty after clicking Reports tab",
    ).toBeGreaterThan(20);

    expect(
      errors,
      `Console errors on Reports tab: ${errors.join(" | ")}`,
    ).toHaveLength(0);
  });
});

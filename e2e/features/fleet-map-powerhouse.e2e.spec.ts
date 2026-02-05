import { test, expect, type Page } from "@playwright/test";

/**
 * Fleet Map Powerhouse E2E Tests
 *
 * Comprehensive tests for the WebGL fleet tracking map powered by
 * MapLibre GL + Samsara GPS integration.
 */

const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

// Run tests serially to avoid parallel login timeouts
test.describe.configure({ mode: "serial" });

let authenticatedPage: Page;

test.describe("Fleet Map Powerhouse", () => {
  test.beforeAll(async ({ browser }) => {
    // Create a single browser context and authenticate once
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    authenticatedPage = await context.newPage();

    // Login
    await authenticatedPage.goto("https://react.ecbtx.com/login");
    await authenticatedPage.waitForLoadState("networkidle");

    const emailInput = authenticatedPage.locator(
      'input[type="email"], input[name="email"]',
    );
    const passwordInput = authenticatedPage.locator('input[type="password"]');

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    const submitBtn = authenticatedPage.getByRole("button", {
      name: /sign in/i,
    });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await passwordInput.press("Enter");
    }

    await authenticatedPage.waitForURL(/\/(dashboard|fleet|onboarding)/, {
      timeout: 20000,
    });

    // Navigate to fleet
    await authenticatedPage.goto("https://react.ecbtx.com/fleet");
    await authenticatedPage.waitForLoadState("networkidle");

    // Wait for fleet page to fully render (loading → content)
    await authenticatedPage
      .locator('text="Fleet Tracking"')
      .waitFor({ state: "visible", timeout: 20000 });

    // Extra wait for map initialization
    await authenticatedPage.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await authenticatedPage?.context().close();
  });

  // ── Page Load ────────────────────────────────────────────────────────────

  test("should render without React errors", async () => {
    const page = authenticatedPage;

    // No error boundary visible
    const errorBoundary = page.getByText("Something went wrong");
    await expect(errorBoundary).not.toBeVisible();

    // Fleet Tracking heading is visible
    await expect(page.getByText("Fleet Tracking")).toBeVisible();
    await expect(page.getByText("Real-time vehicle locations")).toBeVisible();
  });

  // ── WebGL Map ────────────────────────────────────────────────────────────

  test("should render MapLibre GL canvas", async () => {
    const page = authenticatedPage;

    const canvas = page.locator("canvas");
    await expect(canvas.first()).toBeVisible();

    const box = await canvas.first().boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(300);
  });

  test("should display map style toggle buttons", async () => {
    const page = authenticatedPage;

    await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Satellite" }),
    ).toBeVisible();
  });

  test("should switch map style on button click", async () => {
    const page = authenticatedPage;

    // Click Dark button
    const darkBtn = page.getByRole("button", { name: "Dark" });
    await darkBtn.click();
    await page.waitForTimeout(1500);

    // Dark button should be active (has bg-blue-600)
    await expect(darkBtn).toHaveClass(/bg-blue-600/);

    // Switch back to Light
    const lightBtn = page.getByRole("button", { name: "Light" });
    await lightBtn.click();
    await page.waitForTimeout(500);
    await expect(lightBtn).toHaveClass(/bg-blue-600/);
  });

  test("should display Fit All button", async () => {
    const page = authenticatedPage;
    await expect(page.getByRole("button", { name: "Fit All" })).toBeVisible();
  });

  test("should display Vehicle Status legend", async () => {
    const page = authenticatedPage;
    await expect(page.getByText("Vehicle Status")).toBeVisible();

    // Legend items
    const legend = page.locator("text=Vehicle Status").locator("..");
    await expect(legend.getByText("Moving")).toBeVisible();
    await expect(legend.getByText("Stopped")).toBeVisible();
    await expect(legend.getByText("Offline")).toBeVisible();
  });

  // ── Sidebar ──────────────────────────────────────────────────────────────

  test("should display Vehicles heading in sidebar", async () => {
    const page = authenticatedPage;
    await expect(
      page.getByRole("heading", { name: "Vehicles" }),
    ).toBeVisible();
  });

  test("should display search input", async () => {
    const page = authenticatedPage;
    await expect(page.getByPlaceholder("Search vehicles...")).toBeVisible();
  });

  test("should display status filter chips in sidebar", async () => {
    const page = authenticatedPage;

    // Sidebar filter chips
    const sidebar = page.locator(".w-80");
    await expect(sidebar.getByText("Moving").first()).toBeVisible();
    await expect(sidebar.getByText("Stopped").first()).toBeVisible();
    await expect(sidebar.getByText("Offline").first()).toBeVisible();
  });

  test("should list vehicles from Samsara API", async () => {
    const page = authenticatedPage;

    // Footer should show vehicle count
    const footer = page.locator(".border-t.bg-bg-hover");
    const footerText = await footer.textContent();
    expect(footerText).toMatch(/\d+ vehicles/);
  });

  test("should filter vehicles by search text", async () => {
    const page = authenticatedPage;

    const searchInput = page.getByPlaceholder("Search vehicles...");
    await searchInput.fill("Vacuum");
    await page.waitForTimeout(500);

    // Should show vacuum trucks
    const vehicleItems = page.locator("button").filter({ hasText: "Vacuum" });
    const count = await vehicleItems.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test("should show connection status indicator", async () => {
    const page = authenticatedPage;

    // Either "Live" or "Polling" should be visible
    const liveText = page.getByText("Live");
    const pollingText = page.getByText("Polling");

    const isLive = await liveText.first().isVisible().catch(() => false);
    const isPolling = await pollingText.first().isVisible().catch(() => false);
    expect(isLive || isPolling).toBeTruthy();
  });

  // ── Vehicle Interaction ──────────────────────────────────────────────────

  test("should select vehicle from sidebar", async () => {
    const page = authenticatedPage;

    // Click first vehicle in sidebar list
    const vehicleButton = page
      .locator(".w-80 .divide-y button")
      .first();
    await vehicleButton.click();
    await page.waitForTimeout(1000);

    // Selected vehicle should have primary border highlight
    await expect(vehicleButton).toHaveClass(/border-l-primary/);
  });

  test("should show popup for selected vehicle", async () => {
    const page = authenticatedPage;

    // Popup should be visible (from previous test selecting a vehicle)
    // MapLibre popup or the VehicleInfoPopup content
    const speedLabel = page.getByText("Speed:");
    const headingLabel = page.getByText("Heading:");

    const hasSpeed = await speedLabel.isVisible().catch(() => false);
    const hasHeading = await headingLabel.isVisible().catch(() => false);

    expect(hasSpeed || hasHeading).toBeTruthy();
  });

  test("should deselect vehicle on second click", async () => {
    const page = authenticatedPage;

    // The first vehicle should still be selected from previous test
    const vehicleButton = page
      .locator(".w-80 .divide-y button")
      .first();

    // Click again to deselect
    await vehicleButton.click();
    await page.waitForTimeout(500);

    // Should no longer have primary border
    await expect(vehicleButton).not.toHaveClass(/border-l-primary/);
  });

  // ── Stats Bar ────────────────────────────────────────────────────────────

  test("should display Total count in stats bar", async () => {
    const page = authenticatedPage;
    await expect(page.getByText("Total").first()).toBeVisible();
  });

  test("should display Trails and Labels toggles", async () => {
    const page = authenticatedPage;
    await expect(page.getByText("Trails")).toBeVisible();
    await expect(page.getByText("Labels")).toBeVisible();
  });

  test("should toggle Trails checkbox", async () => {
    const page = authenticatedPage;

    const trailsLabel = page.locator("label").filter({ hasText: "Trails" });
    const trailsCheckbox = trailsLabel.locator('input[type="checkbox"]');

    // Should be checked by default
    await expect(trailsCheckbox).toBeChecked();

    // Uncheck
    await trailsCheckbox.uncheck();
    await expect(trailsCheckbox).not.toBeChecked();

    // Re-check
    await trailsCheckbox.check();
    await expect(trailsCheckbox).toBeChecked();
  });

  // ── API Integration ──────────────────────────────────────────────────────

  test("should call Samsara API with 200 on refresh", async () => {
    const page = authenticatedPage;

    let samsaraStatus: number | null = null;

    page.on("response", (resp) => {
      if (
        resp.url().includes("/samsara/vehicles") &&
        !resp.url().includes("history")
      ) {
        samsaraStatus = resp.status();
      }
    });

    // Trigger a page refresh to capture the API call
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    expect(samsaraStatus).toBe(200);
  });

  test("should receive valid vehicle data from API", async () => {
    const page = authenticatedPage;

    let vehicleData: unknown = null;

    page.on("response", async (resp) => {
      if (
        resp.url().includes("/samsara/vehicles") &&
        !resp.url().includes("history") &&
        resp.status() === 200
      ) {
        try {
          vehicleData = await resp.json();
        } catch {}
      }
    });

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    expect(Array.isArray(vehicleData)).toBeTruthy();

    if (Array.isArray(vehicleData) && vehicleData.length > 0) {
      const vehicle = vehicleData[0];

      // Validate vehicle shape
      expect(vehicle).toHaveProperty("id");
      expect(vehicle).toHaveProperty("name");
      expect(vehicle).toHaveProperty("status");
      expect(vehicle).toHaveProperty("location");
      expect(vehicle.location).toHaveProperty("lat");
      expect(vehicle.location).toHaveProperty("lng");
      expect(vehicle.location).toHaveProperty("heading");
      expect(vehicle.location).toHaveProperty("speed");
      expect(vehicle.location).toHaveProperty("updated_at");

      // Status should be valid enum
      expect(["moving", "stopped", "idling", "offline"]).toContain(
        vehicle.status,
      );
    }
  });

  // ── Screenshot ───────────────────────────────────────────────────────────

  test("should capture clean fleet map screenshot", async () => {
    const page = authenticatedPage;

    // Ensure we're on fleet page in good state
    await expect(page.getByText("Fleet Tracking")).toBeVisible();
    await expect(page.getByText("Something went wrong")).not.toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/fleet-map-powerhouse.png",
      fullPage: true,
    });
  });
});

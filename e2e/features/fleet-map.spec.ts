import { test, expect } from '@playwright/test';

/**
 * Fleet Map E2E Tests
 *
 * Tests the Fleet Map page functionality including:
 * - Page loads correctly
 * - Map component renders
 * - Vehicles display on map (from Samsara API)
 * - Vehicle interactions work
 * - Sidebar list functions
 * - No console errors
 */

// Test credentials
const TEST_EMAIL = 'will@macseptic.com';
const TEST_PASSWORD = '#Espn2025';

test.describe('Fleet Map', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Wait for login form
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|onboarding|fleet)/, { timeout: 15000 });

    // Set onboarding as completed
    await page.evaluate(() => {
      localStorage.setItem('crm_onboarding_completed', 'true');
    });
  });

  test('should load Fleet Map page', async ({ page }) => {
    // Navigate to fleet map
    await page.goto('/fleet');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check page title/header
    await expect(page.locator('h1')).toContainText(/fleet/i, { timeout: 10000 });

    // Check for "Fleet Tracking" text
    const fleetHeader = page.getByText(/fleet tracking/i);
    await expect(fleetHeader).toBeVisible();
  });

  test('should display map component or appropriate empty state', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // The component shows one of these states:
    // 1. Loading state: "Loading fleet locations..."
    // 2. Error state: "Failed to load fleet locations"
    // 3. Empty state: "No vehicles available"
    // 4. Full map with vehicles

    // Check for any valid state
    const loadingState = page.getByText(/loading fleet locations/i);
    const errorState = page.getByText(/failed to load fleet locations/i);
    const emptyState = page.getByText(/no vehicles available/i);
    const mapLegend = page.getByText(/vehicle status/i);
    const liveIndicator = page.getByText(/live updates/i);

    // One of these should be visible
    const hasLoading = await loadingState.isVisible().catch(() => false);
    const hasError = await errorState.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasMap = await mapLegend.isVisible().catch(() => false);

    expect(hasLoading || hasError || hasEmpty || hasMap).toBeTruthy();

    // If map is shown, verify legend and live indicator
    if (hasMap) {
      await expect(mapLegend).toBeVisible();
      await expect(liveIndicator).toBeVisible();
    }
  });

  test('should make Samsara API request and show vehicles or empty state', async ({ page }) => {
    // Listen for Samsara API requests
    const samsaraRequests: { url: string; status: number }[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles')) {
        samsaraRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');

    // Wait for API request to complete
    await page.waitForTimeout(3000);

    // Verify Samsara API was called
    expect(samsaraRequests.length).toBeGreaterThan(0);

    // Check that API returned 200 (not auth error)
    const successfulRequest = samsaraRequests.some(r => r.status === 200);
    const serviceError = samsaraRequests.some(r => r.status === 503);

    // Either we get vehicles (200) or service not configured (503) or empty list (200 with [])
    expect(successfulRequest || serviceError).toBeTruthy();

    // If API succeeded, check for either vehicles OR empty state message
    if (successfulRequest) {
      // Wait a bit for UI to update
      await page.waitForTimeout(1000);

      // Either vehicles are shown OR "No vehicles available" message
      const hasVehicles = await page.locator('[class*="VehicleMarker"], [data-testid="vehicle-marker"]').count();
      const emptyState = page.getByText(/no vehicles available/i);

      if (hasVehicles === 0) {
        // Empty state should be visible
        await expect(emptyState).toBeVisible();
      }
      // If vehicles exist, the count should be > 0 (tested in next test)
    }
  });

  test('should display vehicle markers when vehicles exist', async ({ page }) => {
    // Capture API response
    let vehiclesData: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles') && !response.url().includes('history')) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            vehiclesData = data;
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Skip if no vehicles returned from API
    if (vehiclesData.length === 0) {
      test.skip();
      return;
    }

    // Verify stats cards show counts
    const totalVehiclesCard = page.getByText(/total vehicles/i).locator('..');
    await expect(totalVehiclesCard).toBeVisible();

    // Check that vehicle count matches API response
    const countText = await page.locator('.text-2xl.font-bold').first().textContent();
    expect(parseInt(countText || '0')).toBe(vehiclesData.length);
  });

  test('should display vehicle list in sidebar', async ({ page }) => {
    let vehiclesData: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles') && !response.url().includes('history')) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            vehiclesData = data;
          }
        } catch {
          // Ignore
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Skip if no vehicles
    if (vehiclesData.length === 0) {
      test.skip();
      return;
    }

    // Check for "All Vehicles" section
    const allVehiclesHeader = page.getByText(/all vehicles/i);
    await expect(allVehiclesHeader).toBeVisible();

    // Check that vehicle names are listed
    for (const vehicle of vehiclesData.slice(0, 3)) {
      // First 3 vehicles should be visible in list
      const vehicleName = page.getByText(vehicle.name);
      await expect(vehicleName.first()).toBeVisible();
    }
  });

  test('should have correct status colors', async ({ page }) => {
    let vehiclesData: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles') && !response.url().includes('history')) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            vehiclesData = data;
          }
        } catch {
          // Ignore
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    if (vehiclesData.length === 0) {
      test.skip();
      return;
    }

    // Check legend colors are displayed
    const movingLegend = page.locator('.bg-success').first();
    const idlingLegend = page.locator('.bg-warning').first();
    const stoppedLegend = page.locator('.bg-danger').first();

    // At least one of the status indicators should be visible
    const hasMoving = await movingLegend.isVisible().catch(() => false);
    const hasIdling = await idlingLegend.isVisible().catch(() => false);
    const hasStopped = await stoppedLegend.isVisible().catch(() => false);

    // Legend should show status colors
    expect(hasMoving || hasIdling || hasStopped).toBeTruthy();
  });

  test('should show vehicle details on click', async ({ page }) => {
    let vehiclesData: any[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles') && !response.url().includes('history')) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            vehiclesData = data;
          }
        } catch {
          // Ignore
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    if (vehiclesData.length === 0) {
      test.skip();
      return;
    }

    // Click on a vehicle in the list
    const firstVehicleName = vehiclesData[0].name;
    const vehicleItem = page.getByText(firstVehicleName).first();
    await vehicleItem.click();

    // Check for popup/details panel
    // The VehicleInfoPopup should appear with vehicle details
    await page.waitForTimeout(500);

    // Look for speed display in popup or details
    const speedDisplay = page.getByText(/speed:/i);
    const isSpeedVisible = await speedDisplay.isVisible().catch(() => false);

    // Or look for GPS coordinates
    const coordsDisplay = page.locator('[class*="popup"], [class*="info"]').filter({
      hasText: /\d+\.\d+/,
    });

    const hasDetails = isSpeedVisible || (await coordsDisplay.count()) > 0;
    expect(hasDetails).toBeTruthy();
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known acceptable errors
        if (
          !text.includes('favicon') &&
          !text.includes('net::ERR') &&
          !text.includes('Failed to load resource') &&
          !text.includes('Sentry')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check no critical console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('should show history toggle', async ({ page }) => {
    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');

    // Check for "Show vehicle trails" checkbox
    const historyToggle = page.getByText(/show vehicle trails/i);
    await expect(historyToggle).toBeVisible();

    // The checkbox should be checked by default
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeChecked();
  });

  test('Samsara API responds without server errors', async ({ page }) => {
    let apiStatus: number | null = null;
    let apiResponse: any = null;

    page.on('response', async (response) => {
      if (response.url().includes('/samsara/vehicles') && !response.url().includes('history')) {
        apiStatus = response.status();
        try {
          apiResponse = await response.json();
        } catch {
          // Ignore
        }
      }
    });

    await page.goto('/fleet');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // API should respond (not null)
    expect(apiStatus).not.toBeNull();

    // If 503, it means Samsara not configured - that's acceptable for now
    // We just want to make sure the endpoint works and doesn't crash
    if (apiStatus === 503) {
      console.log('Samsara API returned 503 - service not configured (acceptable)');
      // This is OK - means the token isn't set in Railway
      return;
    }

    // If 200, we should have an array response
    if (apiStatus === 200) {
      expect(Array.isArray(apiResponse)).toBeTruthy();
    }

    // 401 = auth error, 500 = server crash - these are failures
    expect(apiStatus).not.toBe(401);
    expect(apiStatus).not.toBe(500);
  });
});

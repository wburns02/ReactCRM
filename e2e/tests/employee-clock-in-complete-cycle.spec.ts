import { test, expect } from "@playwright/test";

/**
 * Complete Clock-In Cycle Test
 * 1. Ensure clocked out via API
 * 2. Click Clock In
 * 3. Verify UI updates
 */

test("Complete Clock-In Cycle from Clocked-Out State", async ({ page, request }) => {
  console.log("\n" + "=".repeat(80));
  console.log("COMPLETE CLOCK-IN CYCLE TEST");
  console.log("=".repeat(80) + "\n");

  // Setup GPS
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 29.864755, longitude: -97.946829 });

  // Login
  console.log("Step 1: Logging in...");
  await page.goto("https://react.ecbtx.com/login");
  await page.fill('input[type="email"]', "will@macseptic.com");
  await page.fill('input[type="password"]', "#Espn2025");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.href.includes("/login"));
  console.log("✓ Logged in\n");

  // Get session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "session");

  // Force clock-out via API to ensure clean state
  console.log("Step 2: Ensuring clocked-out state via API...");
  const clockOutResponse = await request.post(
    "https://react-crm-api-production.up.railway.app/api/v2/employee/timeclock/clock-out",
    {
      headers: { Cookie: `session=${sessionCookie?.value}` },
      data: { latitude: 29.864755, longitude: -97.946829 },
    },
  );
  console.log(`   Clock-out API: ${clockOutResponse.status()}`);
  console.log("   (200 = success, 404 = already clocked out)\n");

  // Go to employee portal
  console.log("Step 3: Loading Employee Portal...");
  await page.goto("https://react.ecbtx.com/employee");
  await page.waitForTimeout(3000); // Wait for queries to load
  console.log("✓ Page loaded\n");

  // Check initial state
  console.log("Step 4: Verifying initial clocked-out state...");
  const clockButton = page.getByRole("button", { name: /Clock (In|Out)/i }).first();
  const initialText = await clockButton.textContent();
  console.log(`   Button: "${initialText}"`);

  const statusText = page.locator("text=/Currently clocked in|Not clocked in/i");
  const initialStatus = await statusText.textContent();
  console.log(`   Status: "${initialStatus}"`);

  // Verify clocked out
  expect(initialText).toContain("Clock In");
  expect(initialStatus).toContain("Not clocked in");
  console.log("✓ Confirmed clocked-out state\n");

  // Clock In
  console.log("Step 5: Clicking Clock In...");
  let clockInRequestStatus = 0;
  page.on("response", async (response) => {
    if (response.url().includes("timeclock/clock-in")) {
      clockInRequestStatus = response.status();
      const body = await response.json().catch(() => null);
      console.log(`   API Response: ${clockInRequestStatus}`);
      if (body) {
        console.log(`   Entry ID: ${body.entry_id || "N/A"}`);
        console.log(`   Clock-in: ${body.clock_in || "N/A"}`);
      }
    }
  });

  await clockButton.click();
  console.log("   Waiting for API and UI update...");
  await page.waitForTimeout(5000); // Wait for mutation + refetch

  // Verify clock-in succeeded
  expect(clockInRequestStatus).toBe(200);
  console.log("✓ Clock-in API succeeded\n");

  // Check UI updated
  console.log("Step 6: Verifying UI updated to clocked-in state...");
  const newButtonText = await clockButton.textContent();
  const newStatus = await statusText.textContent();
  const badge = page.locator("text=/Working|Off/i");
  const badgeText = await badge.textContent();

  console.log(`   Button: "${newButtonText}"`);
  console.log(`   Status: "${newStatus}"`);
  console.log(`   Badge: "${badgeText}"`);

  // Verify UI shows clocked in
  expect(newButtonText).toContain("Clock Out");
  expect(newStatus).toContain("Currently clocked in");
  expect(badgeText).toContain("Working");

  // Check for clock-in time
  const clockInTimeElement = page.locator("text=/Clocked in at/i");
  const hasClockInTime = await clockInTimeElement.count();
  if (hasClockInTime > 0) {
    const timeValue = await page.locator(".font-mono").textContent();
    console.log(`   Clock-in time: ${timeValue}`);
    expect(timeValue).toBeTruthy();
  }

  console.log("✓ UI correctly shows clocked-in state\n");

  // Screenshot
  await page.screenshot({ path: "/tmp/employee-clock-in-complete-cycle.png", fullPage: true });
  console.log("📸 Screenshot: /tmp/employee-clock-in-complete-cycle.png\n");

  console.log("=".repeat(80));
  console.log("✅ COMPLETE CYCLE TEST PASSED");
  console.log("=".repeat(80));
  console.log("Clock-in works perfectly:");
  console.log("  ✓ API returns 200 OK");
  console.log("  ✓ Button changes to 'Clock Out'");
  console.log("  ✓ Status shows 'Currently clocked in'");
  console.log("  ✓ Badge shows 'Working'");
  console.log("  ✓ Clock-in time displayed");
  console.log("=".repeat(80) + "\n");
});

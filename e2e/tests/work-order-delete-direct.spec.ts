import { test, expect } from "@playwright/test";

/**
 * Work Order Deletion Direct Test
 * Tests work order deletion using authenticated browser context
 */

const BASE_URL = "https://react.ecbtx.com";

test.describe("Work Order Deletion (Direct)", () => {
  test("delete work order via UI and API without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const apiErrors: { url: string; status: number; detail?: any }[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("favicon") &&
          !text.includes("Sentry") &&
          !text.includes("ResizeObserver")
        ) {
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        }
      }
    });

    // Capture API errors
    page.on("response", async (res) => {
      if (res.status() >= 400) {
        let detail;
        try {
          detail = await res.json();
        } catch (e) {
          try {
            detail = await res.text();
          } catch (e2) {
            detail = null;
          }
        }

        if (res.url().includes("/work-orders")) {
          apiErrors.push({
            url: res.url(),
            status: res.status(),
            detail,
          });
          console.log(
            `❌ API Error: ${res.status()} ${res.request().method()} ${res.url()}`
          );
          if (detail) {
            console.log(`   Detail: ${JSON.stringify(detail).slice(0, 200)}`);
          }
        }
      }
    });

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
      sessionStorage.setItem(
        "session_state",
        JSON.stringify({ isAuthenticated: true, lastValidated: Date.now() })
      );
    });

    // Navigate to work orders
    console.log("📄 Navigating to Work Orders...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(3000);

    // Create work order directly via browser fetch API (uses session cookies)
    console.log("📝 Creating test work order...");
    const createResult = await page.evaluate(async () => {
      try {
        // Get customer ID
        const customersRes = await fetch("/api/v2/customers?page_size=1", {
          credentials: "include",
        });
        if (!customersRes.ok) {
          return {
            success: false,
            error: `Failed to get customers: ${customersRes.status}`,
          };
        }
        const customers = await customersRes.json();
        const customerId = customers.items[0].id;

        // Create work order
        const createRes = await fetch("/api/v2/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer_id: customerId,
            job_type: "pumping",
            status: "draft",
            priority: "normal",
            estimated_duration_hours: 1,
          }),
        });

        if (!createRes.ok) {
          const errorText = await createRes.text();
          return {
            success: false,
            error: `Create failed: ${createRes.status} - ${errorText.slice(0, 200)}`,
          };
        }

        const workOrder = await createRes.json();
        return { success: true, workOrderId: workOrder.id };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log("Create result:", createResult);
    expect(createResult.success).toBe(true);
    const workOrderId = (createResult as any).workOrderId;
    console.log(`✅ Created work order: ${workOrderId}`);

    // Reload work orders page to see the new work order
    console.log("🔄 Reloading work orders page...");
    await page.reload();
    await page.waitForTimeout(2000);

    // Delete the work order via API (in browser context)
    console.log("🗑️  Deleting work order via API...");
    const deleteResult = await page.evaluate(
      async (id) => {
        try {
          const res = await fetch(`/api/v2/work-orders/${id}`, {
            method: "DELETE",
            credentials: "include",
          });

          let body = "";
          if (!res.ok) {
            try {
              body = await res.text();
            } catch (e) {
              body = "Could not read response body";
            }
          }

          return {
            success: res.ok,
            status: res.status,
            body: body,
          };
        } catch (error: any) {
          return { success: false, error: error.message, status: 0 };
        }
      },
      workOrderId
    );

    console.log("Delete result:", deleteResult);

    // Wait for any pending requests
    await page.waitForTimeout(2000);

    // Check results
    console.log("\n" + "=".repeat(80));
    console.log("DELETION TEST RESULTS");
    console.log("=".repeat(80));
    console.log(`Work Order ID: ${workOrderId}`);
    console.log(`Delete Status: ${deleteResult.status}`);
    console.log(`Delete Success: ${deleteResult.success}`);
    if (deleteResult.body) {
      console.log(`Delete Body: ${deleteResult.body.slice(0, 200)}`);
    }
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`API Errors: ${apiErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log("\n❌ Console Errors:");
      consoleErrors.forEach((err) => console.log(`  - ${err.slice(0, 200)}`));
    }

    if (apiErrors.length > 0) {
      console.log("\n❌ API Errors:");
      apiErrors.forEach((err) => {
        console.log(`  - ${err.status} ${err.url}`);
        if (err.detail) {
          console.log(`    ${JSON.stringify(err.detail).slice(0, 200)}`);
        }
      });
    }

    if (deleteResult.success && consoleErrors.length === 0 && apiErrors.length === 0) {
      console.log("\n✅ SUCCESS! Work order deleted with no errors!");
    } else {
      console.log("\n❌ FAILED! Errors occurred during deletion");
    }

    console.log("=".repeat(80) + "\n");

    expect(deleteResult.status).toBe(204);
    expect(deleteResult.success).toBe(true);
    expect(consoleErrors.length).toBe(0);
    expect(apiErrors.length).toBe(0);
  });
});

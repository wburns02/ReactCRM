import { test, expect } from "@playwright/test";

/**
 * Minimal Work Order Deletion Test
 * Uses the already-working auth pattern from comprehensive scan
 */

test.describe("Work Order Deletion Minimal Test", () => {
  test("verify DELETE endpoint returns 204 not 500", async ({ page }) => {
    const deleteErrors: any[] = [];

    // Capture DELETE responses
    page.on("response", async (res) => {
      if (res.request().method() === "DELETE" && res.url().includes("/work-orders/")) {
        if (res.status() >= 400) {
          let detail;
          try {
            detail = await res.text();
          } catch (e) {
            detail = null;
          }

          deleteErrors.push({
            url: res.url(),
            status: res.status(),
            detail: detail,
          });

          console.log(`❌ DELETE ${res.url()} → ${res.status}`);
          if (detail) {
            console.log(`   Body: ${detail.slice(0, 300)}`);
          }
        } else {
          console.log(`✅ DELETE ${res.url()} → ${res.status} (SUCCESS)`);
        }
      }
    });

    // Use the same login flow that works in comprehensive scan
    console.log("🔐 Logging in...");
    await page.goto("https://react.ecbtx.com/login");

    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');

    // Wait for redirect with more tolerance
    try {
      await page.waitForFunction(() => !window.location.href.includes("/login"), {
        timeout: 20000,
      });
    } catch (e) {
      console.log("⚠️  Login redirect timeout - checking if we're already logged in");
      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        throw new Error("Still on login page after Sign In");
      }
    }

    console.log(`✅ Logged in, current URL: ${page.url()}`);

    // Set onboarding complete
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    await page.waitForTimeout(1000);

    // Try to find and delete a work order
    console.log("📄 Navigating to work orders...");
    await page.goto("https://react.ecbtx.com/work-orders");
    await page.waitForTimeout(3000);

    // Check if we can create + delete via API
    console.log("🔬 Testing CREATE + DELETE via API...");
    const testResult = await page.evaluate(async () => {
      try {
        // Get customer
        const customersRes = await fetch("/api/v2/customers?page_size=1", {
          credentials: "include",
        });
        if (!customersRes.ok) {
          return { phase: "get_customer", success: false, status: customersRes.status };
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
          const body = await createRes.text();
          return { phase: "create", success: false, status: createRes.status, body };
        }

        const workOrder = await createRes.json();
        const woId = workOrder.id;

        // Delete work order
        const deleteRes = await fetch(`/api/v2/work-orders/${woId}`, {
          method: "DELETE",
          credentials: "include",
        });

        let deleteBody = "";
        if (!deleteRes.ok) {
          try {
            deleteBody = await deleteRes.text();
          } catch (e) {
            deleteBody = "(could not read)";
          }
        }

        return {
          phase: "delete",
          success: deleteRes.ok,
          status: deleteRes.status,
          body: deleteBody,
          workOrderId: woId,
        };
      } catch (error: any) {
        return { phase: "exception", success: false, error: error.message };
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("DELETE TEST RESULT");
    console.log("=".repeat(80));
    console.log("Phase:", testResult.phase);
    console.log("Success:", testResult.success);
    console.log("Status:", testResult.status);

    if (testResult.workOrderId) {
      console.log("Work Order ID:", testResult.workOrderId);
    }

    if (testResult.body) {
      console.log("\nResponse Body:");
      console.log(testResult.body);
    }

    if (testResult.error) {
      console.log("Error:", testResult.error);
    }

    console.log(`\nDELETE errors captured: ${deleteErrors.length}`);

    if (deleteErrors.length > 0) {
      console.log("\n❌ DELETE ERRORS:");
      deleteErrors.forEach((err) => {
        console.log(`  ${err.status} - ${err.url}`);
        if (err.detail) console.log(`  Body: ${err.detail}`);
      });
    }

    if (testResult.success && testResult.status === 204) {
      console.log("\n✅ SUCCESS! DELETE returned 204 (No Content)");
    } else if (testResult.status === 500) {
      console.log("\n❌ FAILED! DELETE returned 500 (Internal Server Error)");
    } else {
      console.log(`\n⚠️  DELETE returned unexpected status: ${testResult.status}`);
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(testResult.phase, `Failed at phase: ${testResult.phase}`).toBe("delete");
    expect(testResult.status, `Expected 204, got ${testResult.status}. Body: ${testResult.body}`).toBe(204);
    expect(deleteErrors, `DELETE API errors: ${JSON.stringify(deleteErrors)}`).toHaveLength(0);
  });
});

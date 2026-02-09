import { test, expect } from "@playwright/test";

/**
 * Work Order Delete With Child Records Test
 *
 * Tests the critical scenario:
 * 1. Create work order
 * 2. Add child record (payment) to create FK dependency
 * 3. Attempt DELETE
 * 4. Verify behavior: should either fail gracefully OR soft-delete
 *
 * This reproduces the reported bug where delete shows "success" but item persists
 */

const BASE_URL = "https://react.ecbtx.com";
const API_BASE = "https://react-crm-api-production.up.railway.app/api/v2";

test.describe("Work Order Delete with FK Dependencies", () => {
  test("delete work order with payment should handle FK constraint", async ({ page }) => {
    const deleteResponses: { status: number; body: string }[] = [];
    const errors: string[] = [];

    // Capture DELETE responses
    page.on("response", async (res) => {
      if (res.request().method() === "DELETE" && res.url().includes("/work-orders/")) {
        let body = "";
        try {
          body = await res.text();
        } catch (e) {
          body = "(could not read)";
        }

        deleteResponses.push({ status: res.status(), body });
        console.log(`DELETE ${res.url()} → ${res.status()}`);
        if (body && res.status() >= 400) {
          console.log(`  Body: ${body.slice(0, 300)}`);
        }
      }
    });

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("Sentry") && !text.includes("ResizeObserver")) {
          errors.push(text);
          console.log(`Console Error: ${text.slice(0, 200)}`);
        }
      }
    });

    // Login
    console.log("🔐 Logging in...");
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', "will@macseptic.com");
    await page.fill('input[type="password"]', "#Espn2025");
    await page.click('button:has-text("Sign In")');
    await page.waitForFunction(() => !window.location.href.includes("/login"), { timeout: 20000 });
    await page.evaluate(() => {
      localStorage.setItem("crm_onboarding_completed", "true");
    });

    console.log("✅ Logged in");

    // Step 1: Create work order via API
    console.log("📝 Creating work order...");
    const createResult = await page.evaluate(async (apiBase) => {
      try {
        // Get first customer
        const customersRes = await fetch(`${apiBase}/customers?page_size=1`, {
          credentials: "include",
        });
        if (!customersRes.ok) {
          return { success: false, phase: "get_customer", status: customersRes.status };
        }
        const customers = await customersRes.json();
        const customerId = customers.items[0].id;

        // Create work order
        const createRes = await fetch(`${apiBase}/work-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer_id: customerId,
            job_type: "pumping",
            status: "draft",
            priority: "normal",
            estimated_duration_hours: 1,
            total_amount: 250.00,
          }),
        });

        if (!createRes.ok) {
          const body = await createRes.text();
          return { success: false, phase: "create_work_order", status: createRes.status, body };
        }

        const workOrder = await createRes.json();
        return { success: true, workOrderId: workOrder.id, customerId };
      } catch (error: any) {
        return { success: false, phase: "exception", error: error.message };
      }
    }, API_BASE);

    console.log("Create work order result:", createResult);
    expect(createResult.success, `Work order creation failed at ${createResult.phase}`).toBe(true);

    const workOrderId = (createResult as any).workOrderId;
    const customerId = (createResult as any).customerId;

    // Step 2: Create payment linked to work order (FK dependency)
    console.log(`💰 Creating payment linked to work order ${workOrderId}...`);
    const paymentResult = await page.evaluate(async ({ apiBase, customerId, workOrderId }) => {
      try {
        const createRes = await fetch(`${apiBase}/payments/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customer_id: customerId,
            work_order_id: workOrderId,  // ← FK dependency!
            amount: 100.00,
            payment_method: "credit_card",
            payment_date: new Date().toISOString().split('T')[0],
          }),
        });

        if (!createRes.ok) {
          const body = await createRes.text();
          return { success: false, status: createRes.status, body };
        }

        const payment = await createRes.json();
        return { success: true, paymentId: payment.id };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }, { apiBase: API_BASE, customerId, workOrderId });

    console.log("Create payment result:", paymentResult);
    expect(paymentResult.success, `Payment creation failed: ${JSON.stringify(paymentResult)}`).toBe(true);

    console.log(`✅ Created work order ${workOrderId} with payment ${(paymentResult as any).paymentId}`);

    await page.waitForTimeout(1000);

    // Step 3: Navigate to work orders page
    console.log("📄 Navigating to work orders page...");
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForTimeout(2000);

    // Step 4: Attempt DELETE via API (simulating UI delete button)
    console.log(`🗑️  Attempting DELETE of work order ${workOrderId} (has FK dependency)...`);
    const deleteResult = await page.evaluate(async ({ apiBase, workOrderId }) => {
      try {
        const deleteRes = await fetch(`${apiBase}/work-orders/${workOrderId}`, {
          method: "DELETE",
          credentials: "include",
        });

        let body = "";
        if (!deleteRes.ok) {
          try {
            const json = await deleteRes.json();
            body = JSON.stringify(json);
          } catch (e) {
            body = await deleteRes.text();
          }
        }

        return {
          status: deleteRes.status,
          ok: deleteRes.ok,
          body,
        };
      } catch (error: any) {
        return { status: 0, ok: false, error: error.message };
      }
    }, { apiBase: API_BASE, workOrderId });

    console.log("\n" + "=".repeat(80));
    console.log("DELETE TEST RESULT");
    console.log("=".repeat(80));
    console.log("Delete Status:", deleteResult.status);
    console.log("Delete OK:", deleteResult.ok);

    if (deleteResult.body) {
      console.log("\nResponse Body:");
      console.log(deleteResult.body);
    }

    if (deleteResult.error) {
      console.log("Error:", deleteResult.error);
    }

    // Step 5: Verify work order still exists in DB
    console.log("\n🔍 Verifying work order persistence...");
    const verifyResult = await page.evaluate(async ({ apiBase, workOrderId }) => {
      try {
        const getRes = await fetch(`${apiBase}/work-orders/${workOrderId}`, {
          credentials: "include",
        });

        return {
          exists: getRes.ok,
          status: getRes.status,
        };
      } catch (error: any) {
        return { exists: false, error: error.message };
      }
    }, { apiBase: API_BASE, workOrderId });

    console.log("Verification result:", verifyResult);

    // Step 6: Analyze results
    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS");
    console.log("=".repeat(80));

    if (deleteResult.status === 500) {
      console.log("✅ DELETE returned 500 (FK constraint violation as expected)");
      console.log("✅ Work order still exists:", verifyResult.exists);
      console.log("✅ CORRECT BEHAVIOR: Delete blocked by FK, item persists");
    } else if (deleteResult.status === 204 && verifyResult.exists) {
      console.log("❌ DELETE returned 204 but work order STILL EXISTS!");
      console.log("❌ SILENT FAILURE: Backend said success, but item persists");
      console.log("❌ THIS IS THE BUG!");
    } else if (deleteResult.status === 204 && !verifyResult.exists) {
      console.log("⚠️  DELETE returned 204 and work order removed");
      console.log("⚠️  Unexpected: FK constraint should have blocked this");
      console.log("⚠️  Possible causes: cascade delete configured OR payment FK is nullable");
    } else {
      console.log(`❓ Unexpected status: ${deleteResult.status}`);
    }

    console.log("=".repeat(80) + "\n");

    // Assertions
    // We expect EITHER:
    // A) 500 error + item exists (FK block, correct behavior)
    // B) 204 success + item removed (CASCADE delete working)
    // NOT: 204 success + item exists (silent failure)

    if (deleteResult.status === 204 && verifyResult.exists) {
      throw new Error("SILENT FAILURE: DELETE returned 204 but work order still exists in database!");
    }

    // Log final state
    console.log(`✅ Test completed. Delete status: ${deleteResult.status}, Item exists: ${verifyResult.exists}`);
  });
});

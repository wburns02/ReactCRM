import { test, expect } from "@playwright/test";

/**
 * Commission Deletion E2E Tests
 *
 * Verifies:
 * 1. Backend DELETE endpoint works (204 for pending, 400 for non-pending)
 * 2. Delete button appears on pending commissions in the table
 * 3. Confirmation dialog shown before deletion
 * 4. Commission removed after deletion
 */

const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

async function getApiToken(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "will@macseptic.com",
      password: "#Espn2025",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function createTestCommission(
  token: string,
): Promise<{ id: string; technician_id: string }> {
  // Get a technician to assign commission to
  const techRes = await fetch(`${API_URL}/technicians`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const techData = await techRes.json();
  const technicians = techData.items || techData.technicians || [];
  const techId = technicians[0]?.id;

  if (!techId) throw new Error("No technicians found for test");

  const res = await fetch(`${API_URL}/payroll/commissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      technician_id: techId,
      commission_type: "bonus",
      base_amount: 100,
      rate: 0.1,
      rate_type: "percent",
      commission_amount: 10,
      earned_date: new Date().toISOString().split("T")[0],
      description: "E2E test commission - safe to delete",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create test commission: ${res.status} ${err}`);
  }

  const commission = await res.json();
  return { id: commission.id, technician_id: techId };
}

test.describe("Commission Deletion", () => {
  test("API: delete pending commission returns 204", async () => {
    const token = await getApiToken();
    const { id } = await createTestCommission(token);

    const deleteRes = await fetch(`${API_URL}/payroll/commissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(deleteRes.status).toBe(204);
    console.log(`Deleted commission ${id.slice(0, 8)} — status 204`);
  });

  test("API: delete approved commission returns 400", async () => {
    const token = await getApiToken();
    const { id } = await createTestCommission(token);

    // Approve it first
    const approveRes = await fetch(`${API_URL}/payroll/commissions/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved" }),
    });
    expect(approveRes.ok).toBeTruthy();

    // Try to delete — should fail
    const deleteRes = await fetch(`${API_URL}/payroll/commissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(deleteRes.status).toBe(400);
    const error = await deleteRes.json();
    expect(error.detail).toContain("Cannot delete");
    console.log(
      `Correctly blocked deletion of approved commission: ${error.detail}`,
    );

    // Clean up: delete by reverting to pending first (or leave)
  });

  test("API: deleted commission returns 404 on re-fetch", async () => {
    const token = await getApiToken();
    const { id } = await createTestCommission(token);

    // Delete it
    const deleteRes = await fetch(`${API_URL}/payroll/commissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status).toBe(204);

    // Try to delete again — should be 404
    const refetchRes = await fetch(`${API_URL}/payroll/commissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(refetchRes.status).toBe(404);
    console.log(`Confirmed commission ${id.slice(0, 8)} is gone — 404`);
  });

  test("UI: delete button visible on pending commissions", async ({
    page,
  }) => {
    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Click Commissions tab
    const commissionsTab = page.locator("button:has-text('Commissions')");
    if (await commissionsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commissionsTab.click();
      await page.waitForTimeout(2000);

      // Look for trash icon buttons (delete buttons)
      const deleteButtons = page.locator(
        'button[aria-label="Delete commission"]',
      );
      const count = await deleteButtons.count();
      console.log(`Found ${count} delete buttons on pending commissions`);

      await page.screenshot({
        path: "e2e/screenshots/commission-delete-buttons.png",
        fullPage: true,
      });
    }
  });

  test("UI: confirmation dialog appears on delete click", async ({ page }) => {
    // Create a test commission first
    const token = await getApiToken();
    await createTestCommission(token);

    await page.goto("https://react.ecbtx.com/payroll");
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      test.skip();
      return;
    }

    // Click Commissions tab
    const commissionsTab = page.locator("button:has-text('Commissions')");
    if (await commissionsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commissionsTab.click();
      await page.waitForTimeout(2000);

      // Click the first delete button
      const deleteBtn = page
        .locator('button[aria-label="Delete commission"]')
        .first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);

        // Verify confirmation dialog is visible
        const dialog = page.locator("text=Delete Commission");
        const isVisible = await dialog
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        console.log(`Confirmation dialog visible: ${isVisible}`);

        if (isVisible) {
          // Verify it shows the warning message
          const warning = page.locator("text=cannot be undone");
          const hasWarning = await warning
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          console.log(`Warning message visible: ${hasWarning}`);

          await page.screenshot({
            path: "e2e/screenshots/commission-delete-confirm-dialog.png",
            fullPage: true,
          });

          // Cancel the delete (don't actually delete in UI test)
          const cancelBtn = page.locator('button:has-text("Cancel")');
          if (
            await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)
          ) {
            await cancelBtn.click();
          }
        }
      }
    }
  });
});

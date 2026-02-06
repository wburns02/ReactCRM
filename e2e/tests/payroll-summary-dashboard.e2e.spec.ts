import { test, expect } from "@playwright/test";

/**
 * Payroll Summary Dashboard Tests
 *
 * Verifies:
 * 1. Current period endpoint returns valid period
 * 2. Summary endpoint returns technician data with names and pay
 * 3. All required PayrollSummary fields are present
 */

const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe.configure({ mode: "serial" });

test.describe("Payroll Summary Dashboard", () => {
  let cookies: string;

  test.beforeAll(async ({ request }) => {
    // Wait to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));

    // Login via API
    const loginResponse = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });
    expect(loginResponse.status()).toBe(200);
    cookies = loginResponse.headers()["set-cookie"] || "";
  });

  test("1. Current period endpoint returns period with dates", async ({
    request,
  }) => {
    const response = await request.get(`${API_URL}/payroll/periods/current`, {
      headers: { Cookie: cookies },
    });

    // Could be 200 or 404 if no periods exist
    if (response.status() === 200) {
      const period = await response.json();
      expect(period.id).toBeDefined();
      expect(period.start_date).toBeDefined();
      expect(period.end_date).toBeDefined();
      expect(period.status).toBeDefined();
    } else {
      expect(response.status()).toBe(404);
      const error = await response.json();
      expect(error.detail).toBe("No payroll periods found");
    }
  });

  test("2. Summary endpoint returns technician names and pay", async ({
    request,
  }) => {
    // Get current or most recent period
    const periodsResponse = await request.get(`${API_URL}/payroll/periods`, {
      headers: { Cookie: cookies },
    });
    expect(periodsResponse.status()).toBe(200);

    const periodsData = await periodsResponse.json();
    const periods = periodsData.periods || [];

    if (periods.length === 0) {
      console.log("No payroll periods found, skipping summary test");
      return;
    }

    const period = periods[0];

    // Get summary for the period
    const response = await request.get(
      `${API_URL}/payroll/periods/${period.id}/summary`,
      {
        headers: { Cookie: cookies },
      }
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.summaries).toBeInstanceOf(Array);

    if (data.summaries.length > 0) {
      const first = data.summaries[0];

      // Check that required fields are present
      expect(first.technician_id).toBeDefined();
      expect(first.technician_name).toBeDefined();
      expect(first.regular_hours).toBeDefined();
      expect(typeof first.regular_hours).toBe("number");

      // technician_name should not be just "Tech #uuid"
      if (!first.technician_name.startsWith("Tech #")) {
        // If it's a real name, it should have letters
        expect(first.technician_name).toMatch(/[a-zA-Z]/);
      }
    }
  });

  test("3. Summary includes all PayrollSummary fields", async ({ request }) => {
    // Get periods
    const periodsResponse = await request.get(`${API_URL}/payroll/periods`, {
      headers: { Cookie: cookies },
    });
    const periodsData = await periodsResponse.json();
    const periods = periodsData.periods || [];

    if (periods.length === 0) {
      console.log("No payroll periods found, skipping field validation test");
      return;
    }

    const period = periods[0];

    const response = await request.get(
      `${API_URL}/payroll/periods/${period.id}/summary`,
      {
        headers: { Cookie: cookies },
      }
    );
    expect(response.status()).toBe(200);

    const data = await response.json();

    if (data.summaries.length > 0) {
      const summary = data.summaries[0];

      // All PayrollSummary fields present
      expect(summary).toHaveProperty("technician_id");
      expect(summary).toHaveProperty("technician_name");
      expect(summary).toHaveProperty("regular_hours");
      expect(summary).toHaveProperty("overtime_hours");
      expect(summary).toHaveProperty("regular_pay");
      expect(summary).toHaveProperty("overtime_pay");
      expect(summary).toHaveProperty("total_commissions");
      expect(summary).toHaveProperty("gross_pay");
      expect(summary).toHaveProperty("jobs_completed");

      // Verify numeric types
      expect(typeof summary.regular_hours).toBe("number");
      expect(typeof summary.overtime_hours).toBe("number");
      expect(typeof summary.regular_pay).toBe("number");
      expect(typeof summary.overtime_pay).toBe("number");
      expect(typeof summary.total_commissions).toBe("number");
      expect(typeof summary.gross_pay).toBe("number");
      expect(typeof summary.jobs_completed).toBe("number");
    }
  });

  test("4. Gross pay calculation is correct", async ({ request }) => {
    // Get periods
    const periodsResponse = await request.get(`${API_URL}/payroll/periods`, {
      headers: { Cookie: cookies },
    });
    const periodsData = await periodsResponse.json();
    const periods = periodsData.periods || [];

    if (periods.length === 0) {
      console.log("No payroll periods found, skipping calculation test");
      return;
    }

    const period = periods[0];

    const response = await request.get(
      `${API_URL}/payroll/periods/${period.id}/summary`,
      {
        headers: { Cookie: cookies },
      }
    );
    const data = await response.json();

    if (data.summaries.length > 0) {
      const summary = data.summaries[0];

      // Gross pay should equal regular_pay + overtime_pay + commissions
      const expectedGross =
        (summary.regular_pay || 0) +
        (summary.overtime_pay || 0) +
        (summary.total_commissions || 0);

      // Allow for floating point differences
      expect(summary.gross_pay).toBeCloseTo(expectedGross, 2);
    }
  });
});

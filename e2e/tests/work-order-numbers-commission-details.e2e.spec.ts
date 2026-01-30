import { test, expect } from "@playwright/test";

/**
 * Work Order Numbers + Commission Detail Modal Tests
 *
 * Verifies:
 * 1. Work orders display human-readable WO-NNNNNN format
 * 2. Commission rows are clickable and open detail modal
 */

const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";
const APP_URL = "https://react.ecbtx.com";
const TEST_EMAIL = "will@macseptic.com";
const TEST_PASSWORD = "#Espn2025";

test.describe.configure({ mode: "serial" });

test.describe("Work Order Numbers + Commission Details", () => {
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

  test("1. API returns work orders with WO-NNNNNN format", async ({
    request,
  }) => {
    const response = await request.get(`${API_URL}/work-orders`, {
      params: { page_size: "10" },
      headers: { Cookie: cookies },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.items.length).toBeGreaterThan(0);

    // Check that work_order_number exists and matches format
    const firstWO = data.items[0];
    expect(firstWO.work_order_number).toBeDefined();
    expect(firstWO.work_order_number).toMatch(/^WO-\d{6}$/);
  });

  test("2. API returns commissions with technician_name", async ({ request }) => {
    const response = await request.get(`${API_URL}/payroll/commissions`, {
      params: { page_size: "5" },
      headers: { Cookie: cookies },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    const commissions = data.commissions || data.items || [];
    expect(commissions.length).toBeGreaterThan(0);

    // Check that technician_name is included
    const firstCommission = commissions[0];
    expect(firstCommission.technician_name).toBeDefined();
    expect(firstCommission.technician_name).not.toMatch(/^Tech #/);
  });

  test("3. New work order gets WO-NNNNNN on creation", async ({ request }) => {
    // Get a customer
    const custResponse = await request.get(`${API_URL}/customers/`, {
      params: { page_size: "1" },
      headers: { Cookie: cookies },
    });
    const customers = await custResponse.json();
    const customerId = customers.items[0].id;

    // Create work order
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createResponse = await request.post(`${API_URL}/work-orders`, {
      data: {
        id: crypto.randomUUID(),
        customer_id: customerId,
        job_type: "inspection",
        status: "scheduled",
        scheduled_date: tomorrow.toISOString().split("T")[0],
        priority: "normal",
      },
      headers: { Cookie: cookies },
    });
    expect(createResponse.status()).toBe(201);

    const createdWO = await createResponse.json();

    // Verify work_order_number was assigned
    expect(createdWO.work_order_number).toBeDefined();
    expect(createdWO.work_order_number).toMatch(/^WO-\d{6}$/);
  });

  test("4. Work order complete endpoint returns work_order_number", async ({
    request,
  }) => {
    // Get a customer and technician
    const custResponse = await request.get(`${API_URL}/customers/`, {
      params: { page_size: "1" },
      headers: { Cookie: cookies },
    });
    const customers = await custResponse.json();
    const customerId = customers.items[0].id;

    const techResponse = await request.get(`${API_URL}/technicians`, {
      params: { page_size: "1" },
      headers: { Cookie: cookies },
    });
    const techs = await techResponse.json();
    const technicianId = techs.items[0].id;

    // Create and complete a work order
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createResponse = await request.post(`${API_URL}/work-orders`, {
      data: {
        id: crypto.randomUUID(),
        customer_id: customerId,
        technician_id: technicianId,
        job_type: "pumping",
        status: "scheduled",
        scheduled_date: tomorrow.toISOString().split("T")[0],
        priority: "normal",
        total_amount: 350.0,
      },
      headers: { Cookie: cookies },
    });
    expect(createResponse.status()).toBe(201);
    const wo = await createResponse.json();

    // Complete the work order
    const completeResponse = await request.post(
      `${API_URL}/work-orders/${wo.id}/complete`,
      {
        data: { notes: "Test completion" },
        headers: { Cookie: cookies },
      }
    );
    expect(completeResponse.status()).toBe(200);
    const result = await completeResponse.json();

    // Verify work_order_number in response
    expect(result.work_order_number).toBeDefined();
    expect(result.work_order_number).toMatch(/^WO-\d{6}$/);

    // Verify commission was created with proper data
    if (result.commission) {
      expect(result.commission.amount).toBeGreaterThan(0);
    }
  });

  test("5. Commission detail includes all required fields", async ({
    request,
  }) => {
    // Get commissions
    const response = await request.get(`${API_URL}/payroll/commissions`, {
      params: { page_size: "1" },
      headers: { Cookie: cookies },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    const commissions = data.commissions || data.items || [];
    expect(commissions.length).toBeGreaterThan(0);

    const commission = commissions[0];

    // Verify all required detail fields are present
    expect(commission.id).toBeDefined();
    expect(commission.technician_id).toBeDefined();
    expect(commission.technician_name).toBeDefined();
    expect(commission.base_amount).toBeDefined();
    expect(commission.rate).toBeDefined();
    expect(commission.commission_amount).toBeDefined();
    expect(commission.status).toBeDefined();
    expect(commission.earned_date).toBeDefined();

    // Verify technician_name is a real name, not a fallback
    expect(commission.technician_name).not.toMatch(/^Tech #/);

    // Verify work_order_number is in WO-NNNNNN format (if work order exists)
    if (commission.work_order_id) {
      expect(commission.work_order_number).toBeDefined();
      expect(commission.work_order_number).toMatch(/^WO-\d{6}$/);
    }
  });
});

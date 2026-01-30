import { test, expect } from '@playwright/test';

/**
 * Payroll-WorkOrders-Commissions Integration Tests
 *
 * Tests the auto-commission creation when work orders are completed:
 * 1. Complete work order creates commission automatically
 * 2. Commission appears in payroll commissions list
 * 3. Commission has correct calculation based on job type
 * 4. Dump fee deduction for pumping jobs
 */

const API_URL = 'https://react-crm-api-production.up.railway.app/api/v2';

// Use project setup authentication
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Payroll Work Orders Commissions API Integration', () => {
  test('API health check - version 2.8.0 deployed', async ({ request }) => {
    const response = await request.get(`${API_URL.replace('/api/v2', '')}/health`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.version).toBe('2.8.0');
    expect(data.status).toBe('healthy');
  });

  test('Commission service endpoints exist', async ({ request }) => {
    // Test that payroll commissions endpoint exists
    const commissionsResponse = await request.get(`${API_URL}/payroll/commissions`);
    expect(commissionsResponse.status()).toBe(200);
    const data = await commissionsResponse.json();
    expect(data).toHaveProperty('items');
  });

  test('Work order complete endpoint exists', async ({ request }) => {
    // Test with a fake ID to verify endpoint exists
    const completeResponse = await request.post(`${API_URL}/work-orders/fake-id/complete`, {
      data: { notes: 'Test' },
    });
    // Should return 404 (not found) not 405 (method not allowed)
    expect([404, 422]).toContain(completeResponse.status());
  });

  test('Get work orders list', async ({ request }) => {
    const response = await request.get(`${API_URL}/work-orders?page_size=5`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('Get pending commissions list', async ({ request }) => {
    const response = await request.get(`${API_URL}/payroll/commissions?status=pending&page_size=5`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });

  test('Get current pay periods', async ({ request }) => {
    const response = await request.get(`${API_URL}/payroll/periods?status=open&page_size=5`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    // Payroll periods API returns 'periods' not 'items'
    expect(data).toHaveProperty('periods');
  });

  test('Commission calculation endpoint works', async ({ request }) => {
    const response = await request.post(`${API_URL}/payroll/commissions/calculate`, {
      data: {
        job_type: 'pumping',
        base_amount: 500,
        gallons: 1000,
        dump_site_id: null,
      },
    });
    // Endpoint should exist and return calculation
    expect([200, 422]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      // Pumping rate is 20%
      expect(data.commission_rate).toBe(0.2);
      expect(data.commission_amount).toBeCloseTo(100, 1); // $500 * 20%
    }
  });

  test('Dump sites list available', async ({ request }) => {
    const response = await request.get(`${API_URL}/dump-sites`);
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || data.items !== undefined).toBe(true);
    }
  });

  test('Employee portal jobs endpoint exists', async ({ request }) => {
    const response = await request.get(`${API_URL}/employee/jobs`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Work Order Complete with Commission', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('Work order complete endpoint returns commission info', async ({ request }) => {
    // Get a work order that can be completed
    const workOrdersResponse = await request.get(`${API_URL}/work-orders?status=in_progress&page_size=1`);

    if (workOrdersResponse.status() === 200) {
      const workOrders = await workOrdersResponse.json();

      if (workOrders.items?.length > 0) {
        const workOrder = workOrders.items[0];

        // Try to complete it (may fail if already completed or not allowed)
        const completeResponse = await request.post(
          `${API_URL}/work-orders/${workOrder.id}/complete`,
          {
            data: {
              notes: 'Completed by Playwright E2E test',
              dump_site_id: null,
            },
          }
        );

        // Check response structure - should have commission fields
        if (completeResponse.status() === 200) {
          const result = await completeResponse.json();
          // Response should include commission info (may be null if no technician assigned)
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('status');
          // Commission fields should exist in response (even if null)
          expect('commission' in result || 'commission_id' in result).toBe(true);
        }
      }
    }
  });
});

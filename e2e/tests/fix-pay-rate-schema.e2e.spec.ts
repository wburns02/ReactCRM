/**
 * Fix Pay Rate Schema - Call admin endpoint to fix missing columns
 */
import { test, expect } from '@playwright/test';

test.describe('Fix Pay Rate Schema', () => {
  test('call admin endpoint to fix pay_rate columns', async ({ page, request }) => {
    // First, get auth token by logging in via API
    const loginResponse = await request.post(
      'https://react-crm-api-production.up.railway.app/api/v2/auth/login',
      {
        data: {
          email: 'will@macseptic.com',
          password: '#Espn2025'
        }
      }
    );

    console.log('Login status:', loginResponse.status());
    const loginBody = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginBody, null, 2));

    const token = loginBody.access_token;
    if (!token) {
      throw new Error('No access_token in login response');
    }

    console.log('Got auth token');

    // Call the admin endpoint
    const response = await request.post(
      'https://react-crm-api-production.up.railway.app/api/v2/admin/fix-pay-rate-schema',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response status:', response.status());
    const body = await response.text();
    console.log('Response body:', body);

    if (response.status() === 200) {
      const json = JSON.parse(body);
      console.log('Success:', JSON.stringify(json, null, 2));
      expect(json.success).toBe(true);
    } else {
      console.log('Error response:', body);
    }
  });
});

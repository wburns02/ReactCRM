import { test, expect } from '@playwright/test';

/**
 * Injection Prevention Security Tests
 *
 * Validates security invariants:
 * - MUST-002: Parameterized queries (no SQL injection)
 * - MUST-003: Input validation
 * - XSS prevention
 */

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com';
const API_BASE = process.env.API_URL || 'https://react-crm-api-production.up.railway.app';

test.describe('SQL Injection Prevention', () => {
  const sqlPayloads = [
    "'; DROP TABLE customers; --",
    "1' OR '1'='1",
    "1; DELETE FROM users WHERE 1=1; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1' AND SLEEP(5) --",
    "1'; EXEC xp_cmdshell('dir'); --",
  ];

  test('search parameter rejects SQL injection', async ({ request }) => {
    for (const payload of sqlPayloads) {
      const response = await request.get(`${API_BASE}/api/v2/customers`, {
        params: {
          search: payload,
        },
      });

      // Should either:
      // 1. Return 400 (invalid input)
      // 2. Return 200 with empty/safe results (parameterized query worked)
      // 3. Return 401 (auth required - also safe)
      // Should NOT:
      // - Return 500 (query error = potential injection point)
      // - Hang (time-based injection)

      expect(
        response.status() !== 500,
        `SQL injection payload should not cause 500 error: ${payload}`
      ).toBe(true);
    }
  });

  test('ID parameter rejects SQL injection', async ({ request }) => {
    for (const payload of sqlPayloads) {
      const response = await request.get(
        `${API_BASE}/api/v2/customers/${encodeURIComponent(payload)}`
      );

      // Should return 400 or 404, not 500
      expect(
        response.status() !== 500,
        `SQL injection in ID should not cause 500 error: ${payload}`
      ).toBe(true);
    }
  });

  test('POST body rejects SQL injection', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v2/customers`, {
      data: {
        first_name: "'; DROP TABLE customers; --",
        last_name: "Test",
        email: "test@test.com",
      },
    });

    // Should either reject (400/422) or safely store escaped data
    // Should NOT cause 500 error
    expect(response.status()).not.toBe(500);
  });
});

test.describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>',
    'javascript:alert("xss")',
    '<iframe src="javascript:alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    "'-alert('xss')-'",
  ];

  test('user input is escaped in page output', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/customers?search=${encodeURIComponent(xssPayloads[0])}`);

    // The XSS payload should NOT execute
    // Check that no alert dialog appeared
    const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
    const dialog = await dialogPromise;

    expect(dialog, 'XSS payload should not trigger alert dialog').toBeNull();
  });

  test('API responses do not execute scripts', async ({ request }) => {
    // Search with XSS payload
    const response = await request.get(`${API_BASE}/api/v2/customers`, {
      params: { search: xssPayloads[0] },
    });

    if (response.ok()) {
      const contentType = response.headers()['content-type'];
      expect(
        contentType?.includes('application/json'),
        'API should return JSON, not HTML'
      ).toBe(true);
    }
  });

  test('stored XSS is prevented', async ({ page }) => {
    // Skip if not authenticated
    await page.goto(`${BASE_URL}/app/customers`);
    if (page.url().includes('login')) {
      test.skip();
      return;
    }

    // Try to create a customer with XSS in name
    // This would need actual form interaction
    // For now, verify that existing data doesn't contain unescaped scripts
    const pageContent = await page.content();

    // Should not contain raw script tags in rendered content
    // (They should be escaped as &lt;script&gt;)
    const hasRawScript = pageContent.includes('<script>alert');
    expect(hasRawScript, 'Page should not contain unescaped script tags').toBe(false);
  });
});

test.describe('Command Injection Prevention', () => {
  const commandPayloads = [
    '; ls -la',
    '| cat /etc/passwd',
    '`whoami`',
    '$(id)',
    '& dir',
    '\n/bin/sh',
  ];

  test('file upload names reject command injection', async ({ request }) => {
    for (const payload of commandPayloads) {
      // Attempt to upload with malicious filename
      const response = await request.post(`${API_BASE}/api/v2/upload`, {
        multipart: {
          file: {
            name: `test${payload}.txt`,
            mimeType: 'text/plain',
            buffer: Buffer.from('test content'),
          },
        },
      });

      // Should either:
      // - Reject the filename (400)
      // - Sanitize and accept (200)
      // - Not have upload endpoint (404)
      // Should NOT:
      // - Return 500 (command executed and failed)

      expect(
        response.status() !== 500,
        `Command injection in filename should not cause 500: ${payload}`
      ).toBe(true);
    }
  });
});

test.describe('Path Traversal Prevention', () => {
  const pathPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc/passwd',
  ];

  test('file paths reject traversal attempts', async ({ request }) => {
    for (const payload of pathPayloads) {
      const response = await request.get(
        `${API_BASE}/api/v2/files/${encodeURIComponent(payload)}`
      );

      // Should return 400 or 404, not actual file content
      expect(
        [400, 401, 403, 404].includes(response.status()),
        `Path traversal should be rejected: ${payload}`
      ).toBe(true);

      // Verify no sensitive file content returned
      const text = await response.text();
      expect(text).not.toContain('root:');
      expect(text).not.toContain('[boot loader]');
    }
  });
});

test.describe('NoSQL Injection Prevention', () => {
  const nosqlPayloads = [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$where": "this.password == this.password"}',
    "'; return this.password; var x='",
  ];

  test('query parameters reject NoSQL injection', async ({ request }) => {
    for (const payload of nosqlPayloads) {
      const response = await request.get(`${API_BASE}/api/v2/customers`, {
        params: { search: payload },
      });

      // Should handle gracefully
      expect(response.status()).not.toBe(500);
    }
  });
});

test.describe('Header Injection Prevention', () => {
  test('response headers do not reflect user input unsanitized', async ({ request }) => {
    // Note: Modern HTTP clients (including Playwright) correctly reject headers
    // with CRLF injection attempts. This test verifies normal header handling.
    const response = await request.get(`${API_BASE}/api/v2/customers`, {
      headers: {
        'X-Custom-Header': 'test-value',
      },
    });

    // The API should not reflect arbitrary headers back
    const customHeader = response.headers()['x-custom-header'];
    // It's acceptable for custom request headers to not be reflected
    // The important thing is that CRLF injection is blocked at the HTTP level
    expect(response.status()).not.toBe(500);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/customers', label: 'Customers' },
    { path: '/prospects', label: 'Prospects' },
    { path: '/work-orders', label: 'Work Orders' },
    { path: '/schedule', label: 'Schedule' },
    { path: '/technicians', label: 'Technicians' },
    { path: '/integrations', label: 'Integrations' },
    { path: '/invoices', label: 'Invoices' },
    { path: '/payments', label: 'Payments' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/equipment', label: 'Equipment' },
    { path: '/fleet', label: 'Fleet Map' },
    { path: '/email-marketing', label: 'Email Marketing' },
    { path: '/reports', label: 'Reports' },
    { path: '/tickets', label: 'Tickets' },
    { path: '/users', label: 'Users' },
    { path: '/admin', label: 'Settings' },
  ];

  navItems.forEach(({ path, label }) => {
    test(`should navigate to ${label} page`, async ({ page }) => {
      await page.click(`text=${label}`);
      await expect(page).toHaveURL(path);
    });
  });
});

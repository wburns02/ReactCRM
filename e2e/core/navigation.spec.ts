import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://react.ecbtx.com/app';

// Navigation groups that need to be expanded before clicking items
const navGroups = {
  'operations': ['Work Orders', 'Schedule', 'Technicians'],
  'communications': ['Integrations'],
  'financial': ['Quotes', 'Invoices', 'Payments', 'Payroll'],
  'assets': ['Inventory', 'Equipment', 'Fleet Map'],
  'marketing': ['Marketing Hub', 'Email Marketing', 'SMS Consent', 'Reports'],
  'support': ['Tickets'],
  'system': ['Users', 'Settings', 'Pricing'],
};

// Find which group a nav item belongs to
function findGroup(label: string): string | null {
  for (const [group, items] of Object.entries(navGroups)) {
    if (items.includes(label)) return group;
  }
  return null;
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    // Wait for sidebar to be visible
    await expect(page.locator('aside nav')).toBeVisible({ timeout: 10000 });
  });

  // Top-level nav items (always visible)
  const topNavItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/my-portal', label: 'My Portal' },
    { path: '/customers', label: 'Customers' },
    { path: '/prospects', label: 'Prospects' },
  ];

  // Nav items inside collapsible groups
  const groupedNavItems = [
    { path: '/work-orders', label: 'Work Orders', group: 'Operations' },
    { path: '/schedule', label: 'Schedule', group: 'Operations' },
    { path: '/technicians', label: 'Technicians', group: 'Operations' },
    { path: '/integrations', label: 'Integrations', group: 'Communications' },
    { path: '/quotes', label: 'Quotes', group: 'Financial' },
    { path: '/invoices', label: 'Invoices', group: 'Financial' },
    { path: '/payments', label: 'Payments', group: 'Financial' },
    { path: '/payroll', label: 'Payroll', group: 'Financial' },
    { path: '/inventory', label: 'Inventory', group: 'Assets' },
    { path: '/equipment', label: 'Equipment', group: 'Assets' },
    { path: '/fleet', label: 'Fleet Map', group: 'Assets' },
    { path: '/marketing', label: 'Marketing Hub', group: 'Marketing' },
    { path: '/email-marketing', label: 'Email Marketing', group: 'Marketing' },
    { path: '/marketing/sms', label: 'SMS Consent', group: 'Marketing' },
    { path: '/reports', label: 'Reports', group: 'Marketing' },
    { path: '/tickets', label: 'Tickets', group: 'Support' },
    { path: '/users', label: 'Users', group: 'System' },
    { path: '/admin', label: 'Settings', group: 'System' },
    { path: '/admin/pricing', label: 'Pricing', group: 'System' },
  ];

  // Test top-level navigation items
  topNavItems.forEach(({ path, label }) => {
    test(`should navigate to ${label} page`, async ({ page }) => {
      // Scope to sidebar navigation to avoid duplicate links
      const sidebar = page.locator('aside nav');
      await sidebar.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  });

  // Test grouped navigation items (need to expand group first)
  groupedNavItems.forEach(({ path, label, group }) => {
    test(`should navigate to ${label} page`, async ({ page }) => {
      // Scope to sidebar navigation
      const sidebar = page.locator('aside nav');
      const link = sidebar.getByRole('link', { name: label });

      // Check if link is already visible (group may be pre-expanded)
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) {
        // Expand the group by clicking on it
        await sidebar.getByRole('button', { name: new RegExp(group, 'i') }).click();
        await expect(link).toBeVisible({ timeout: 5000 });
      }

      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  });
});

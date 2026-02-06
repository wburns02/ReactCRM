import { test, expect } from '@playwright/test';

test.describe('Job Costing Page Current State', () => {
  test('Login and check job costing page', async ({ page }) => {
    // Login
    await page.goto('https://react.ecbtx.com/login');
    await page.waitForLoadState('networkidle');
    
    console.log('=== LOGIN PAGE ===');
    console.log('Current URL:', page.url());
    
    await page.fill('input[name="email"], input[type="email"]', 'will@macseptic.com');
    await page.fill('input[name="password"], input[type="password"]', '#Espn2025');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    console.log('After login URL:', page.url());
    
    // Navigate to job costing
    await page.goto('https://react.ecbtx.com/job-costing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n=== JOB COSTING PAGE ===');
    console.log('Current URL:', page.url());
    
    // Check page title
    const title = await page.locator('h1').first().textContent();
    console.log('Page title:', title);
    
    // Check for summary cards
    const cardCount = await page.locator('.text-2xl.font-bold').count();
    console.log('Summary metric count:', cardCount);
    
    // Get values from summary cards
    const metrics = await page.locator('.text-2xl.font-bold').allTextContents();
    console.log('Metric values:', metrics);
    
    // Check if there's a costs list
    const costRows = await page.locator('tbody tr').count();
    console.log('Cost rows found:', costRows);
    
    // Check for empty state
    const emptyState = await page.locator('text=No costs found').count();
    console.log('Empty state visible:', emptyState > 0);
    
    // Check for AI panel
    const aiPanel = await page.locator('text=AI Profitability').count();
    console.log('AI Panel visible:', aiPanel > 0);
    
    // Screenshot
    await page.screenshot({ path: '/tmp/job-costing-current.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/job-costing-current.png');
    
    // Check for work order selector (expected to be missing)
    const workOrderSelector = await page.locator('select, [role="combobox"]').count();
    console.log('\n=== FEATURES CHECK ===');
    console.log('Dropdown/selector count:', workOrderSelector);
    
    // Check for Add Cost button
    const addButton = await page.locator('text=Add Cost, text=Add First Cost, text=+ Add').count();
    console.log('Add button visible:', addButton > 0);
    
    // Check date range inputs
    const dateInputs = await page.locator('input[type="date"]').count();
    console.log('Date inputs:', dateInputs);
    
    expect(title).toContain('Job Costing');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invoices');
  });

  test('should display the invoices page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    await expect(page.getByText('Process and manage vendor invoices')).toBeVisible();
  });

  test('should display new invoice button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new invoice/i })).toBeVisible();
  });

  test('should display invoice table headers', async ({ page }) => {
    await expect(page.locator('th').filter({ hasText: 'Invoice #' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Amount' })).toBeVisible();
  });

  test('should show filter panel when filter button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    
    await expect(page.getByText('Match Status')).toBeVisible();
    await expect(page.getByText('Risk Level')).toBeVisible();
    await expect(page.getByText('Overdue Only')).toBeVisible();
  });

  test('should filter by risk level', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    
    // Find and select risk level filter
    const riskSelect = page.locator('select').nth(2);
    await riskSelect.selectOption('HIGH');
    
    await page.waitForTimeout(500);
    
    // Clear filters
    await page.getByRole('button', { name: /clear filters/i }).click();
  });
});

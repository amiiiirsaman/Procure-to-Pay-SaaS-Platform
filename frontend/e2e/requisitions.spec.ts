import { test, expect } from '@playwright/test';

test.describe('Requisitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/requisitions');
  });

  test('should display the requisitions page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Requisitions' })).toBeVisible();
    await expect(page.getByText('Manage purchase requisitions')).toBeVisible();
  });

  test('should display new requisition button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /new requisition/i })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search requisitions/i).first()).toBeVisible();
  });

  test('should display filter button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible();
  });

  test('should show filter panel when filter button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    
    await expect(page.locator('label').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Department' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Urgency' })).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.getByRole('button', { name: /filters/i }).click();
    
    const statusSelect = page.locator('select').first();
    await statusSelect.selectOption('APPROVED');
    
    // Should update the table
    await page.waitForTimeout(500);
    
    // Clear filters
    await page.getByRole('button', { name: /clear filters/i }).click();
  });

  test('should search requisitions', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search requisitions/i).first();
    await searchInput.fill('Office');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(500);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display the dashboard page', async ({ page }) => {
    await expect(page).toHaveTitle(/P2P/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display stat cards', async ({ page }) => {
    await expect(page.getByText('Pending Approvals')).toBeVisible();
    await expect(page.getByText('Open POs')).toBeVisible();
    await expect(page.getByText('Pending Invoices')).toBeVisible();
    await expect(page.getByText('Overdue Invoices')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    await expect(page.getByText('Spend Trend')).toBeVisible();
    await expect(page.getByText('Spend by Category')).toBeVisible();
  });

  test('should navigate to requisitions from sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /requisitions/i }).click();
    await expect(page).toHaveURL(/\/requisitions/);
    await expect(page.getByRole('heading', { name: 'Requisitions' })).toBeVisible();
  });

  test('should navigate to invoices from sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /invoices/i }).click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
  });

  test('should navigate to approvals from sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /approvals/i }).click();
    await expect(page).toHaveURL(/\/approvals/);
    await expect(page.getByRole('heading', { name: 'Pending Approvals' })).toBeVisible();
  });
});

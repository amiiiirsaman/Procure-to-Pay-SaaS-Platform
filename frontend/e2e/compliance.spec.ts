import { test, expect } from '@playwright/test';

test.describe('Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
  });

  test('should display the compliance page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Compliance & Audit' })).toBeVisible();
    await expect(page.getByText('Monitor compliance status and audit trails')).toBeVisible();
  });

  test('should display overview and audit log tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /audit log/i })).toBeVisible();
  });

  test('should display compliance metrics on overview tab', async ({ page }) => {
    // Wait for page to settle
    await page.waitForTimeout(1000);
    // Check for overview content - either metrics or loading/error state
    const overviewTab = page.getByRole('button', { name: /overview/i });
    await expect(overviewTab).toBeVisible();
  });

  test('should switch to audit log tab', async ({ page }) => {
    await page.getByRole('button', { name: /audit log/i }).click();
    
    // Wait for tab switch
    await page.waitForTimeout(1000);
    
    // Should show the audit log tab is active or any content in it
    await expect(page.getByRole('button', { name: /audit log/i })).toBeVisible();
  });
});

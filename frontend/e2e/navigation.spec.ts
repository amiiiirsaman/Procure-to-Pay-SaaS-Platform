import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should redirect root to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate between all main pages', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to a subset of main sections to verify navigation works
    const sections = [
      { link: /requisitions/i, url: '/requisitions', heading: 'Requisitions' },
      { link: /invoices/i, url: '/invoices', heading: 'Invoices' },
      { link: /compliance/i, url: '/compliance', heading: 'Compliance & Audit' },
      { link: /dashboard/i, url: '/dashboard', heading: 'Dashboard' },
    ];

    for (const section of sections) {
      // Wait for sidebar to stabilize before clicking
      const link = page.getByRole('link', { name: section.link }).first();
      await link.waitFor({ state: 'attached' });
      await link.click();
      await expect(page).toHaveURL(new RegExp(section.url));
      await expect(page.getByRole('heading', { name: section.heading })).toBeVisible();
    }
  });

  test('should show active state for current nav item', async ({ page }) => {
    await page.goto('/requisitions');
    
    const navItem = page.getByRole('link', { name: /requisitions/i });
    await expect(navItem).toHaveClass(/nav-item-active/);
  });

  test('should display header with search', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should handle 404 redirect to dashboard', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

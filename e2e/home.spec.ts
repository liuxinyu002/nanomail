/**
 * NanoMail E2E Tests - Home Page
 *
 * Tests the basic loading and functionality of the home page.
 */
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveTitle(/NanoMail/i);

    // Check for main content area
    const mainContent = page.locator('main, [role="main"], #root');
    await expect(mainContent).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    // Look for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveTitle(/NanoMail/i);

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page).toHaveTitle(/NanoMail/i);
  });
});
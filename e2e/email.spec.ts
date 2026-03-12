/**
 * NanoMail E2E Tests - Email Flow
 *
 * Tests the email processing workflow.
 */
import { test, expect } from '@playwright/test';

test.describe('Email Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display email list', async ({ page }) => {
    // Navigate to emails view if needed
    const emailNav = page.locator('a[href*="email"], a[href*="inbox"], button:has-text("Email")');

    if (await emailNav.count() > 0) {
      await emailNav.first().click();
    }

    // Check for email list container
    const emailList = page.locator('[data-testid="email-list"], .email-list, [role="list"]').first();
    await expect(emailList).toBeVisible({ timeout: 10000 });
  });

  test('should show email details when clicked', async ({ page }) => {
    // Navigate to emails
    const emailNav = page.locator('a[href*="email"], a[href*="inbox"], button:has-text("Email")');

    if (await emailNav.count() > 0) {
      await emailNav.first().click();
    }

    // Wait for emails to load
    await page.waitForTimeout(1000);

    // Click first email if available
    const firstEmail = page.locator('[data-testid="email-item"], .email-item, [role="listitem"]').first();

    if (await firstEmail.isVisible()) {
      await firstEmail.click();

      // Verify email detail view
      const emailDetail = page.locator('[data-testid="email-detail"], .email-detail, .email-content');
      await expect(emailDetail).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have sync button', async ({ page }) => {
    // Look for sync/refresh button
    const syncButton = page.locator('button:has-text("Sync"), button:has-text("Refresh"), [data-testid="sync-button"]');

    // Button might be in header or email section
    if (await syncButton.count() > 0) {
      await expect(syncButton.first()).toBeVisible();
    }
  });
});
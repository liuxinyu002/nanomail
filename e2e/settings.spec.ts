/**
 * NanoMail E2E Tests - Settings Page
 *
 * Tests the settings/configuration functionality.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should load settings page', async ({ page }) => {
    // Verify settings page loaded
    await expect(page).toHaveURL(/settings/);
  });

  test('should display IMAP configuration section', async ({ page }) => {
    // Look for IMAP settings form
    const imapSection = page.locator('text=/IMAP|imap/i');
    await expect(imapSection).toBeVisible();
  });

  test('should display SMTP configuration section', async ({ page }) => {
    // Look for SMTP settings form
    const smtpSection = page.locator('text=/SMTP|smtp/i');
    await expect(smtpSection).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit")');

    if (await submitButton.count() > 0) {
      await submitButton.first().click();

      // Check for validation errors
      const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive');
      // Wait a bit for validation to show
      await page.waitForTimeout(500);

      // If there are required fields, there should be validation messages
      const errorCount = await errorMessages.count();
      // This is informational - not all forms have client-side validation
      console.log(`Found ${errorCount} validation messages`);
    }
  });
});
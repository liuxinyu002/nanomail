/**
 * NanoMail E2E Tests - Using Page Object Model
 *
 * This test demonstrates the Page Object Model pattern.
 */
import { test, expect } from '@playwright/test';
import { HomePage, SettingsPage } from './pages';

test.describe('NanoMail with Page Objects', () => {
  let homePage: HomePage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    settingsPage = new SettingsPage(page);
  });

  test('should navigate from home to settings', async ({ page }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(/NanoMail/i);

    await homePage.navigateToSettings();
    await expect(page).toHaveURL(/settings/);
  });

  test('should display settings sections', async ({ page }) => {
    await settingsPage.goto();

    await expect(settingsPage.imapSection).toBeVisible();
    await expect(settingsPage.smtpSection).toBeVisible();
  });
});
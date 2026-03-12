/**
 * Custom Playwright Test Fixtures
 *
 * Extends the base test with custom fixtures for NanoMail testing.
 */
import { test as base } from '@playwright/test';
import { HomePage, SettingsPage } from './pages';

// Define custom fixtures
type NanoMailFixtures = {
  homePage: HomePage;
  settingsPage: SettingsPage;
};

// Extend base test with custom fixtures
export const test = base.extend<NanoMailFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },
});

export { expect } from '@playwright/test';
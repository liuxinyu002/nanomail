/**
 * Home Page Object
 */
import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly navigation: Locator;
  readonly mainContent: Locator;

  constructor(page: Page) {
    super(page);
    this.navigation = page.locator('nav, [role="navigation"]');
    this.mainContent = page.locator('main, [role="main"], #root');
  }

  async goto() {
    await super.goto('/');
    await this.waitForReady();
  }

  async isLoaded(): Promise<boolean> {
    return this.mainContent.isVisible();
  }

  async navigateToSettings() {
    await this.page.click('a[href*="settings"], button:has-text("Settings")');
  }

  async navigateToEmails() {
    await this.page.click('a[href*="email"], a[href*="inbox"], button:has-text("Email")');
  }
}
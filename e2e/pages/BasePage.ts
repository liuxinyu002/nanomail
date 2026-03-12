/**
 * Base Page Object Model
 *
 * All page objects should extend this class.
 * Provides common utilities and selectors.
 */
import { Locator, Page, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be ready
   */
  async waitForReady() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get element by test id
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return element.isVisible();
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
/**
 * Settings Page Object
 */
import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  readonly imapSection: Locator;
  readonly smtpSection: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.imapSection = page.locator('text=/IMAP|imap/i').first();
    this.smtpSection = page.locator('text=/SMTP|smtp/i').first();
    this.saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
  }

  async goto() {
    await super.goto('/settings');
    await this.waitForReady();
  }

  async fillImapConfig(config: {
    host: string;
    port: string;
    user: string;
    password: string;
  }) {
    const imapForm = this.page.locator('form, [data-testid="imap-form"]').first();

    await imapForm.locator('input[name*="host"], input[placeholder*="host"]').fill(config.host);
    await imapForm.locator('input[name*="port"], input[placeholder*="port"]').fill(config.port);
    await imapForm.locator('input[name*="user"], input[placeholder*="user"]').fill(config.user);
    await imapForm.locator('input[name*="password"], input[placeholder*="password"]').fill(config.password);
  }

  async fillSmtpConfig(config: {
    host: string;
    port: string;
    user: string;
    password: string;
  }) {
    const smtpForm = this.page.locator('form, [data-testid="smtp-form"]').first();

    await smtpForm.locator('input[name*="host"], input[placeholder*="host"]').fill(config.host);
    await smtpForm.locator('input[name*="port"], input[placeholder*="port"]').fill(config.port);
    await smtpForm.locator('input[name*="user"], input[placeholder*="user"]').fill(config.user);
    await smtpForm.locator('input[name*="password"], input[placeholder*="password"]').fill(config.password);
  }

  async save() {
    await this.saveButton.click();
  }

  async isConfigSaved(): Promise<boolean> {
    // Look for success message
    const successMessage = this.page.locator('text=/saved|success|updated/i');
    return successMessage.isVisible();
  }
}
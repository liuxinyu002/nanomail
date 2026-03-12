/**
 * Test Utilities and Helpers
 */
import { Page } from '@playwright/test';

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate a random email for testing
 */
export function randomEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Mock LLM Service for E2E tests
 *
 * This intercepts LLM API calls and returns fixed responses.
 * Essential for preventing flaky tests caused by LLM randomness.
 */
export async function mockLLMService(page: Page, response: {
  summary?: string;
  draft?: string;
  spamScore?: number;
} = {}) {
  const defaultResponse = {
    summary: 'This is a test summary.',
    draft: 'Dear Team, Thank you for your email.',
    spamScore: 0,
    ...response
  };

  // Intercept OpenAI API calls
  await page.route('**/openai.com/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify(defaultResponse)
          }
        }]
      })
    });
  });

  // Intercept DeepSeek API calls
  await page.route('**/deepseek.com/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify(defaultResponse)
          }
        }]
      })
    });
  });

  // Intercept Ollama local API calls
  await page.route('**/localhost:11434/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: JSON.stringify(defaultResponse)
      })
    });
  });
}

/**
 * Clear all mock routes
 */
export async function clearMocks(page: Page) {
  await page.unrouteAll();
}
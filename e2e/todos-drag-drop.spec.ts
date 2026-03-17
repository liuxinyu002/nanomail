import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Todo Drag and Drop functionality
 *
 * Test Scenarios from Plan:
 * 1. Inbox -> Board Column: Task moves to target column, position is set
 * 2. Inbox -> Planner: Task deadline is set, task stays in Inbox
 * 3. Board Column -> Inbox: Task moves to Inbox (boardColumnId = 1)
 * 4. Board Column -> Planner: Task deadline is set, task rebounds to original column
 * 5. Board Column -> Board Column: Task moves to new column with correct position
 * 6. Within Same Column: Task reorder with position update
 */

test.describe('Todo Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos')
    // Wait for page to load
    await expect(page.locator('[data-testid="view-toggle"]')).toBeVisible()
  })

  test('should display all three view panels by default', async ({ page }) => {
    // All panels should be visible
    await expect(page.locator('[data-testid="inbox-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="planner-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="board-panel"]')).toBeVisible()
  })

  test('should have view toggle with all views active', async ({ page }) => {
    const inboxToggle = page.locator('[data-testid="view-toggle"] button:has-text("Inbox")')
    const plannerToggle = page.locator('[data-testid="view-toggle"] button:has-text("Planner")')
    const boardToggle = page.locator('[data-testid="view-toggle"] button:has-text("Board")')

    // All should be pressed (active)
    await expect(inboxToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(plannerToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(boardToggle).toHaveAttribute('aria-pressed', 'true')
  })

  test('should toggle view visibility', async ({ page }) => {
    // Hide planner
    const plannerToggle = page.locator('[data-testid="view-toggle"] button:has-text("Planner")')
    await plannerToggle.click()

    // Planner panel should be hidden
    await expect(page.locator('[data-testid="planner-panel"]')).not.toBeVisible()

    // Show planner again
    await plannerToggle.click()
    await expect(page.locator('[data-testid="planner-panel"]')).toBeVisible()
  })

  test('should prevent deleting last active view', async ({ page }) => {
    // Deselect Planner and Board
    await page.locator('[data-testid="view-toggle"] button:has-text("Planner")').click()
    await page.locator('[data-testid="view-toggle"] button:has-text("Board")').click()

    // Now only Inbox is active
    const inboxToggle = page.locator('[data-testid="view-toggle"] button:has-text("Inbox")')

    // Try to deselect Inbox (last active view)
    await inboxToggle.click()

    // Inbox should still be active
    await expect(inboxToggle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="inbox-panel"]')).toBeVisible()
  })

  test('should display inbox panel with correct structure', async ({ page }) => {
    const inboxPanel = page.locator('[data-testid="inbox-panel"]')

    // Should have header
    await expect(inboxPanel.locator('h2:has-text("Inbox")')).toBeVisible()

    // Should have droppable zone
    await expect(inboxPanel.locator('[data-testid="droppable-zone"]')).toBeVisible()
  })

  test('should display board panel with columns', async ({ page }) => {
    const boardPanel = page.locator('[data-testid="board-panel"]')

    // Should have header
    await expect(boardPanel.locator('h2:has-text("Board")')).toBeVisible()

    // Should have columns container
    await expect(boardPanel.locator('[data-testid="columns-container"]')).toBeVisible()

    // Should have Todo, In Progress, Done columns (not Inbox - column 1)
    await expect(boardPanel.locator('[data-testid="board-column-2"]')).toBeVisible()
    await expect(boardPanel.locator('[data-testid="board-column-3"]')).toBeVisible()
    await expect(boardPanel.locator('[data-testid="board-column-4"]')).toBeVisible()

    // Inbox column (1) should NOT be displayed in Board
    await expect(boardPanel.locator('[data-testid="board-column-1"]')).not.toBeVisible()
  })

  test('should display planner panel with calendar', async ({ page }) => {
    const plannerPanel = page.locator('[data-testid="planner-panel"]')

    // Should have header
    await expect(plannerPanel.locator('h2:has-text("Planner")')).toBeVisible()

    // Should have calendar component
    await expect(plannerPanel.locator('[data-testid="todo-calendar"]')).toBeVisible()
  })

  test('should support keyboard navigation on view toggle', async ({ page }) => {
    // Tab to view toggle
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to navigate between toggle buttons
    const inboxToggle = page.locator('[data-testid="view-toggle"] button:has-text("Inbox")')

    // Focus should be on a toggle button
    await expect(inboxToggle.or(page.locator('[data-testid="view-toggle"] button').first())).toBeFocused()
  })
})

test.describe('Todo Drag and Drop - Drag Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos')
    await expect(page.locator('[data-testid="view-toggle"]')).toBeVisible()
  })

  // Note: These tests require actual todo items in the database
  // They may need to be adjusted based on the actual implementation

  test.skip('should drag todo from Inbox to Board column', async ({ page }) => {
    // This test requires:
    // 1. A todo in Inbox (boardColumnId = 1)
    // 2. Drag it to a board column
    // 3. Verify it moved (boardColumnId updated)

    // Placeholder for manual testing or when test data is available
  })

  test.skip('should set deadline when dragging to Planner', async ({ page }) => {
    // This test requires:
    // 1. A todo in Inbox or Board
    // 2. Drag it to a Planner date cell
    // 3. Verify deadline is set

    // Placeholder for manual testing or when test data is available
  })

  test.skip('should maintain position after reorder', async ({ page }) => {
    // This test requires:
    // 1. Multiple todos in same column
    // 2. Reorder them via drag
    // 3. Refresh page and verify order

    // Placeholder for manual testing or when test data is available
  })

  test.skip('should rebound when dragging from Board to Planner', async ({ page }) => {
    // This test verifies the critical UX pattern:
    // 1. A todo in a Board column (not Inbox)
    // 2. Drag it to Planner date cell
    // 3. Verify:
    //    - Deadline is set
    //    - Todo rebounds to original column (boardColumnId unchanged)

    // Placeholder for manual testing or when test data is available
  })
})

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/todos')
    await expect(page.locator('[data-testid="view-toggle"]')).toBeVisible()
  })

  test('should have proper heading structure', async ({ page }) => {
    // Main page should have proper heading hierarchy
    const headings = await page.locator('h1, h2, h3').all()

    // Should have at least some headings
    expect(headings.length).toBeGreaterThan(0)

    // First heading should be h1 or h2
    const firstHeading = headings[0]
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase())
    expect(['h1', 'h2']).toContain(tagName)
  })

  test('should have accessible toggle buttons', async ({ page }) => {
    const toggleButtons = await page.locator('[data-testid="view-toggle"] button').all()

    for (const button of toggleButtons) {
      // Each button should have aria-pressed
      const ariaPressed = await button.getAttribute('aria-pressed')
      expect(['true', 'false']).toContain(ariaPressed)
    }
  })

  test('should have proper role attributes', async ({ page }) => {
    // View toggle container should have role="group"
    const viewToggle = page.locator('[data-testid="view-toggle"]')
    await expect(viewToggle).toHaveAttribute('role', 'group')

    // View toggle should have aria-label
    await expect(viewToggle).toHaveAttribute('aria-label')
  })

  test('should be keyboard navigable', async ({ page }) => {
    // Focus should be able to reach all interactive elements
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all()

    // Should have focusable elements
    expect(focusableElements.length).toBeGreaterThan(0)
  })
})
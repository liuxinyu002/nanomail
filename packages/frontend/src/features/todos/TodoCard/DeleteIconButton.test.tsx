import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteIconButton } from './DeleteIconButton'

// Mock AlertDialog to avoid portal issues in tests
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="alert-dialog" data-open={open}>{children}</div>
  ),
  AlertDialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="alert-dialog-trigger">{children}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogAction: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="alert-dialog-action" onClick={onClick} className={className}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}))

// Helper to get the main delete icon button (not the dialog action button)
function getDeleteIconButton() {
  // The main button has aria-label="Delete" and is not inside the alert-dialog
  const buttons = screen.getAllByRole('button')
  return buttons.find(btn =>
    btn.getAttribute('aria-label') === 'Delete' &&
    !btn.hasAttribute('data-testid')
  )!
}

describe('DeleteIconButton', () => {
  const defaultProps = {
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render a button with Trash2 icon', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toBeInTheDocument()

      // Check for SVG icon (Trash2 from lucide-react)
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should have accessible label', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveAttribute('aria-label', 'Delete')
    })

    it('should have gray color by default', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('text-[#6B7280]')
    })

    it('should have red hover color', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('hover:text-red-500')
    })

    it('should have transition for color change', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('transition-colors')
    })

    it('should have small padding', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('p-1')
    })

    it('should have rounded corners', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('rounded')
    })
  })

  describe('Event Propagation', () => {
    it('should stop propagation on button click (card should not expand/collapse)', async () => {
      const parentClickHandler = vi.fn()
      render(
        <div onClick={parentClickHandler}>
          <DeleteIconButton {...defaultProps} />
        </div>
      )

      const button = getDeleteIconButton()
      await userEvent.click(button)

      // Parent click handler should NOT be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled()
    })
  })

  describe('Confirmation Dialog', () => {
    it('should show confirmation dialog when button is clicked', async () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('should show correct title in confirmation dialog', async () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('确认删除')
    })

    it('should show warning message in description', async () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('此操作无法撤销')
    })

    it('should have Cancel button in dialog', async () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      expect(screen.getByTestId('alert-dialog-cancel')).toHaveTextContent('取消')
    })

    it('should have Delete button with destructive styling in dialog', async () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      expect(confirmButton).toHaveTextContent('删除')
      expect(confirmButton).toHaveClass('bg-red-600')
    })
  })

  describe('Delete Action', () => {
    it('should call onDelete when Delete is confirmed in dialog', async () => {
      const onDelete = vi.fn()
      render(<DeleteIconButton onDelete={onDelete} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      await userEvent.click(confirmButton)

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should NOT call onDelete when Cancel is clicked in dialog', async () => {
      const onDelete = vi.fn()
      render(<DeleteIconButton onDelete={onDelete} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      await userEvent.click(cancelButton)

      expect(onDelete).not.toHaveBeenCalled()
    })

    it('should NOT call onDelete when dialog is dismissed', async () => {
      const onDelete = vi.fn()
      render(<DeleteIconButton onDelete={onDelete} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      // Simulate dismissing the dialog by clicking cancel
      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      await userEvent.click(cancelButton)

      expect(onDelete).not.toHaveBeenCalled()
    })

    it('should close dialog after confirming delete', async () => {
      const onDelete = vi.fn()
      render(<DeleteIconButton onDelete={onDelete} />)

      const button = getDeleteIconButton()
      await userEvent.click(button)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      await userEvent.click(confirmButton)

      // Dialog should be closed (data-open should be false)
      const alertDialog = screen.getByTestId('alert-dialog')
      expect(alertDialog).toHaveAttribute('data-open', 'false')
    })
  })

  describe('Edge Cases', () => {
    it('should work when onDelete is undefined (no-op)', () => {
      // Component should not crash if onDelete is not provided
      render(<DeleteIconButton />)

      const button = getDeleteIconButton()
      expect(button).toBeInTheDocument()
    })

    it('should handle multiple rapid clicks gracefully', async () => {
      const onDelete = vi.fn()
      render(<DeleteIconButton onDelete={onDelete} />)

      const button = getDeleteIconButton()

      // Rapid double click
      await userEvent.click(button)
      await userEvent.click(button)

      // Should only show one dialog
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      button.focus()
      expect(button).toHaveFocus()
    })

    it('should have type="button" to prevent form submission', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should have hover background effect', () => {
      render(<DeleteIconButton {...defaultProps} />)

      const button = getDeleteIconButton()
      expect(button).toHaveClass('hover:bg-red-50')
    })
  })
})
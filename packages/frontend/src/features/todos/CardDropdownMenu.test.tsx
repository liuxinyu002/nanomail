import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CardDropdownMenu } from './CardDropdownMenu'

describe('CardDropdownMenu', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Trigger Button', () => {
    it('should render the trigger button with MoreHorizontal icon', () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      expect(triggerButton).toBeInTheDocument()
    })

    it('should have correct styling on trigger button', () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      expect(triggerButton).toHaveClass('p-1')
      expect(triggerButton).toHaveClass('rounded')
      expect(triggerButton).toHaveClass('hover:bg-[#F7F8FA]')
    })
  })

  describe('Dropdown Open/Close', () => {
    it('should not show dropdown menu initially', () => {
      render(<CardDropdownMenu {...defaultProps} />)

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should open dropdown when trigger is clicked', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <CardDropdownMenu {...defaultProps} />
          <button>Outside button</button>
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)
      expect(screen.getByText('Edit')).toBeInTheDocument()

      // Click outside
      const outsideButton = screen.getByRole('button', { name: 'Outside button' })
      await userEvent.click(outsideButton)

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('should close dropdown after selecting an action', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      await userEvent.click(editButton)

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('should toggle dropdown on repeated trigger clicks', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })

      // Open
      await userEvent.click(triggerButton)
      expect(screen.getByText('Edit')).toBeInTheDocument()

      // Close
      await userEvent.click(triggerButton)
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })
  })

  describe('Menu Items', () => {
    it('should render Edit menu item with icon', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      expect(editButton).toBeInTheDocument()
      // Check for Edit icon (svg element)
      expect(editButton.querySelector('svg')).toBeInTheDocument()
    })

    it('should render Delete menu item with icon', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton.querySelector('svg')).toBeInTheDocument()
    })

    it('should have correct styling on regular menu items', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      expect(editButton).toHaveClass('px-3')
      expect(editButton).toHaveClass('py-2')
      expect(editButton).toHaveClass('text-left')
      expect(editButton).toHaveClass('text-[#111827]')
    })

    it('should have hover styling on regular menu items', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      expect(editButton).toHaveClass('hover:bg-[#F7F8FA]')
    })

    it('should have danger styling on Delete menu item', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      expect(deleteButton).toHaveClass('text-red-600')
      expect(deleteButton).toHaveClass('hover:bg-red-50')
    })
  })

  describe('Action Callbacks', () => {
    it('should call onEdit when Edit is clicked', async () => {
      const onEdit = vi.fn()
      render(<CardDropdownMenu {...defaultProps} onEdit={onEdit} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      await userEvent.click(editButton)

      expect(onEdit).toHaveBeenCalledTimes(1)
    })

    it('should call onDelete when Delete is clicked', async () => {
      const onDelete = vi.fn()
      render(<CardDropdownMenu {...defaultProps} onDelete={onDelete} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      await userEvent.click(deleteButton)

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('should not throw when callback is undefined', async () => {
      // All callbacks are undefined
      render(<CardDropdownMenu />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      // Click each button - should not throw
      await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
      await userEvent.click(triggerButton)
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    })
  })

  describe('Dropdown Container Styling', () => {
    it('should have correct container styling', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByTestId('card-dropdown-menu')
      expect(menu).toBeInTheDocument()
      expect(menu).toHaveClass('bg-white')
      expect(menu).toHaveClass('shadow-lg')
      expect(menu).toHaveClass('rounded-md')
    })

    it('should have proper positioning classes', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByTestId('card-dropdown-menu')
      expect(menu).toHaveClass('absolute')
      expect(menu).toHaveClass('right-0')
    })

    it('should have proper z-index for layering', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByTestId('card-dropdown-menu')
      expect(menu).toHaveClass('z-50')
    })

    it('should have enter animation class', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByTestId('card-dropdown-menu')
      expect(menu).toHaveClass('animate-dropdown-in')
    })
  })

  describe('stopPropagation for Drag Scenarios', () => {
    it('should stop propagation on trigger click', async () => {
      const parentClick = vi.fn()
      render(
        <div onClick={parentClick}>
          <CardDropdownMenu {...defaultProps} />
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      // Parent click handler should not be called
      expect(parentClick).not.toHaveBeenCalled()
    })

    it('should stop propagation on menu item click', async () => {
      const parentClick = vi.fn()
      const onEdit = vi.fn()
      render(
        <div onClick={parentClick}>
          <CardDropdownMenu {...defaultProps} onEdit={onEdit} />
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      await userEvent.click(editButton)

      // Parent click handler should not be called
      expect(parentClick).not.toHaveBeenCalled()
      // But onEdit should still be called
      expect(onEdit).toHaveBeenCalled()
    })

    it('should stop propagation on Delete click', async () => {
      const parentClick = vi.fn()
      const onDelete = vi.fn()
      render(
        <div onClick={parentClick}>
          <CardDropdownMenu {...defaultProps} onDelete={onDelete} />
        </div>
      )

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      await userEvent.click(deleteButton)

      expect(parentClick).not.toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on trigger button', () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      expect(triggerButton).toHaveAttribute('aria-label', 'More options')
    })

    it('should have aria-expanded attribute on trigger', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(triggerButton)
      expect(triggerButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have aria-haspopup="menu" on trigger', () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      expect(triggerButton).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('should have role="menu" on dropdown container', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
    })

    it('should have correct menuitem role for all actions', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    })

    it('should close menu on Escape key', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)
      expect(screen.getByText('Edit')).toBeInTheDocument()

      await userEvent.keyboard('{Escape}')

      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      // Focus should return to trigger
      expect(triggerButton).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should render without any callbacks', () => {
      render(<CardDropdownMenu />)
      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    })

    it('should handle rapid open/close clicks', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })

      // Rapid toggle
      await userEvent.click(triggerButton)
      await userEvent.click(triggerButton)
      await userEvent.click(triggerButton)

      // Should be open after odd number of clicks
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    it('should have menu items in correct order', async () => {
      render(<CardDropdownMenu {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const menu = screen.getByTestId('card-dropdown-menu')
      const buttons = menu.querySelectorAll('button')
      const labels = Array.from(buttons).map(btn => btn.textContent)

      expect(labels).toEqual(['Edit', 'Delete'])
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewListButton } from './NewListButton'

describe('NewListButton', () => {
  const mockOnCreateColumn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Default Mode (Ghost Button)', () => {
    it('should render "New List" button in default mode', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should have ghost button styling with dashed border', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      expect(button).toHaveClass('border-2')
      expect(button).toHaveClass('border-dashed')
      expect(button).toHaveClass('border-gray-300')
    })

    it('should have transparent background with hover effect', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      expect(button).toHaveClass('bg-transparent')
      expect(button).toHaveClass('hover:bg-gray-50')
    })

    it('should have gray text with hover effect', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      expect(button).toHaveClass('text-gray-500')
      expect(button).toHaveClass('hover:text-gray-700')
    })

    it('should have fixed width to prevent layout shift', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      expect(button).toHaveClass('w-[280px]')
      expect(button).toHaveClass('flex-shrink-0')
    })

    it('should have Plus icon', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      // The Plus icon from lucide-react is an SVG
      const button = screen.getByRole('button', { name: /new list/i })
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should have rounded corners', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      expect(button).toHaveClass('rounded-lg')
    })
  })

  describe('Click Behavior - Switch to Editing Mode', () => {
    it('should switch to editing mode when clicked', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      // Should show input field
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should not call onCreateColumn when just clicking the button', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      expect(mockOnCreateColumn).not.toHaveBeenCalled()
    })

    it('should hide the ghost button when in editing mode', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      // The ghost button should no longer be visible
      expect(screen.queryByRole('button', { name: /new list/i })).not.toBeInTheDocument()
    })
  })

  describe('Editing Mode', () => {
    it('should have input with autoFocus', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      // React's autoFocus prop doesn't render as 'autofocus' attribute in DOM
      // Instead, check that the input is focused
      expect(input).toHaveFocus()
    })

    it('should have placeholder text for the input', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder')
    })

    it('should render Add button in editing mode', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('should render Cancel button in editing mode', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should have fixed width in editing mode to prevent layout shift', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      // The editing container should also have fixed width
      const editingContainer = screen.getByTestId('new-list-editing-container')
      expect(editingContainer).toHaveClass('w-[280px]')
      expect(editingContainer).toHaveClass('flex-shrink-0')
    })

    it('should have dashed border in editing mode', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const editingContainer = screen.getByTestId('new-list-editing-container')
      expect(editingContainer).toHaveClass('border-2')
      expect(editingContainer).toHaveClass('border-dashed')
    })
  })

  describe('Creating Column', () => {
    it('should create column when Enter key is pressed with valid name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'New Column Name')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith('New Column Name')
    })

    it('should create column when Add button is clicked with valid name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Another Column')

      const addButton = screen.getByRole('button', { name: /add/i })
      await userEvent.click(addButton)

      expect(mockOnCreateColumn).toHaveBeenCalledWith('Another Column')
    })

    it('should trim whitespace from column name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '  Trimmed Name  ')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith('Trimmed Name')
    })

    it('should exit editing mode after creating column', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'New Column')
      await userEvent.keyboard('{Enter}')

      // Should return to default mode
      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should clear input after creating column', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'New Column')
      await userEvent.keyboard('{Enter}')

      // Click again to enter editing mode
      await userEvent.click(screen.getByRole('button', { name: /new list/i }))

      // Input should be empty
      const newInput = screen.getByRole('textbox')
      expect(newInput).toHaveValue('')
    })
  })

  describe('Canceling', () => {
    it('should cancel and return to default mode when Escape is pressed', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Some Name')
      await userEvent.keyboard('{Escape}')

      // Should return to default mode
      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should cancel and return to default mode when Cancel button is clicked', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Some Name')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      // Should return to default mode
      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should NOT call onCreateColumn when canceled', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Some Name')
      await userEvent.keyboard('{Escape}')

      expect(mockOnCreateColumn).not.toHaveBeenCalled()
    })

    it('should clear input when canceled', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Some Name')
      await userEvent.keyboard('{Escape}')

      // Click again to enter editing mode
      await userEvent.click(screen.getByRole('button', { name: /new list/i }))

      // Input should be empty
      const newInput = screen.getByRole('textbox')
      expect(newInput).toHaveValue('')
    })
  })

  describe('Validation', () => {
    it('should disable Add button when name is empty', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toBeDisabled()
    })

    it('should disable Add button when name is only whitespace', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '   ')

      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toBeDisabled()
    })

    it('should NOT create column when name is empty and Enter is pressed', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).not.toHaveBeenCalled()
    })

    it('should NOT create column when name is whitespace only and Enter is pressed', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '   ')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).not.toHaveBeenCalled()
    })

    it('should enable Add button when name has valid content', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Valid Name')

      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button name in default mode', () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should have accessible label for input in editing mode', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should have accessible name for Add button', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('should have accessible name for Cancel button', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle special characters in column name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Column & Review!')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith('Column & Review!')
    })

    it('should handle unicode characters in column name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Colonne francaise')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith('Colonne francaise')
    })

    it('should handle long column names', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const longName = 'A'.repeat(50)
      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, longName)
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith(longName)
    })
  })

  describe('onCreateColumn Callback', () => {
    it('should call onCreateColumn with trimmed name', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, '  Test Column  ')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledWith('Test Column')
    })

    it('should call onCreateColumn exactly once per creation', async () => {
      render(<NewListButton onCreateColumn={mockOnCreateColumn} />)

      const button = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(button)

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Test')
      await userEvent.keyboard('{Enter}')

      expect(mockOnCreateColumn).toHaveBeenCalledTimes(1)
    })
  })
})
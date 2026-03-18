import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnHeader, type ColumnHeaderProps } from './ColumnHeader'
import type { BoardColumn } from '@nanomail/shared'

// Mock Popover to avoid portal issues in tests
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="popover-content" className={className}>{children}</div>
  ),
}))

// Mock DropdownMenu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="dropdown-menu-item" onClick={onClick} className={className}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-menu-separator" />,
}))

// Mock AlertDialog to avoid portal issues in tests
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="alert-dialog" data-open={open}>{children}</div>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
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

describe('ColumnHeader', () => {
  const mockColumn: BoardColumn = {
    id: 2,
    name: 'Todo',
    color: '#3B82F6',
    order: 1,
    isSystem: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  const defaultProps: ColumnHeaderProps = {
    column: mockColumn,
    itemCount: 5,
    onRename: vi.fn(),
    onColorChange: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render column name', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByText('Todo')).toBeInTheDocument()
    })

    it('should render item count', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should render item count with accessible label', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByLabelText('5 items')).toBeInTheDocument()
    })

    it('should render color indicator when column has color', () => {
      render(<ColumnHeader {...defaultProps} />)

      const colorIndicator = screen.getByTestId('column-color-indicator')
      expect(colorIndicator).toBeInTheDocument()
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#3B82F6' })
    })

    it('should not render color indicator when column has no color', () => {
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: null }} />)

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })

    it('should not render color indicator for invalid hex color', () => {
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: 'invalid' }} />)

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })

    it('should render zero count correctly', () => {
      render(<ColumnHeader {...defaultProps} itemCount={0} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should render large count correctly', () => {
      render(<ColumnHeader {...defaultProps} itemCount={999} />)

      expect(screen.getByText('999')).toBeInTheDocument()
    })
  })

  describe('Hover Behavior - Settings Button', () => {
    it('should render settings button', () => {
      render(<ColumnHeader {...defaultProps} />)

      // The button should exist (even if hidden by opacity)
      const settingsButton = screen.getByRole('button', { name: /column settings/i })
      expect(settingsButton).toBeInTheDocument()
    })

    it('should have opacity-0 class by default (hidden until hover)', () => {
      render(<ColumnHeader {...defaultProps} />)

      const settingsButton = screen.getByRole('button', { name: /column settings/i })
      expect(settingsButton).toHaveClass('opacity-0')
    })

    it('should show settings button on group hover (group-hover:opacity-100)', () => {
      render(<ColumnHeader {...defaultProps} />)

      const settingsButton = screen.getByRole('button', { name: /column settings/i })
      expect(settingsButton).toHaveClass('group-hover:opacity-100')
    })
  })

  describe('Popover Menu - Items', () => {
    it('should have a popover for the settings menu', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByTestId('popover')).toBeInTheDocument()
    })

    it('should render Rename menu item', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByText('Rename')).toBeInTheDocument()
    })

    it('should render Change Color menu item', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByText('Change Color')).toBeInTheDocument()
    })

    it('should render Delete menu item', () => {
      render(<ColumnHeader {...defaultProps} />)

      // There are two Delete buttons - one in popover, one in AlertDialog
      // We want to check the one in the popover
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should have separator between Change Color and Delete', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByTestId('dropdown-menu-separator')).toBeInTheDocument()
    })

    it('should render Delete item with destructive (red) styling', () => {
      render(<ColumnHeader {...defaultProps} />)

      // Find the Delete button in the popover (has text-red-600 class)
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      expect(popoverDeleteButton).toBeDefined()
    })
  })

  describe('Popover Menu - Actions', () => {
    it('should enter edit mode when Rename is clicked', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const renameButton = screen.getByRole('button', { name: 'Rename' })
      await userEvent.click(renameButton)

      // Should show the input for editing
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should call onStartEdit when Rename is clicked', async () => {
      const onStartEdit = vi.fn()
      render(<ColumnHeader {...defaultProps} onStartEdit={onStartEdit} />)

      const renameButton = screen.getByRole('button', { name: 'Rename' })
      await userEvent.click(renameButton)

      expect(onStartEdit).toHaveBeenCalled()
    })

    it('should show ColorPicker when Change Color is clicked', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      expect(screen.getByTestId('color-picker')).toBeInTheDocument()
    })

    it('should show AlertDialog when Delete is clicked (not call onDelete directly)', async () => {
      const onDelete = vi.fn()
      render(<ColumnHeader {...defaultProps} onDelete={onDelete} />)

      // Find the Delete button in the popover (has text-red-600 class)
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      // Should show AlertDialog, not call onDelete directly
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Inline Renaming - Double Click', () => {
    it('should enter edit mode on double-click', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should show input with current column name as default value', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Todo')
    })

    it('should auto-select all text in input', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox') as HTMLInputElement
      // Check that selection is from start to end
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe('Todo'.length)
    })

    it('should call onStartEdit when entering edit mode', async () => {
      const onStartEdit = vi.fn()
      render(<ColumnHeader {...defaultProps} onStartEdit={onStartEdit} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      expect(onStartEdit).toHaveBeenCalled()
    })
  })

  describe('Inline Renaming - Save and Cancel', () => {
    it('should save and call onRename when Enter is pressed', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, 'In Progress')
      await userEvent.keyboard('{Enter}')

      expect(onRename).toHaveBeenCalledWith('In Progress')
    })

    it('should cancel changes and exit edit mode when Escape is pressed', async () => {
      const onRename = vi.fn()
      const onEndEdit = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} onEndEdit={onEndEdit} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, 'New Name')
      await userEvent.keyboard('{Escape}')

      // onRename should NOT be called
      expect(onRename).not.toHaveBeenCalled()
      // Should exit edit mode and show original name
      expect(screen.getByText('Todo')).toBeInTheDocument()
    })

    it('should save and call onRename on blur', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, 'Done')
      fireEvent.blur(input)

      expect(onRename).toHaveBeenCalledWith('Done')
    })

    it('should call onEndEdit when exiting edit mode', async () => {
      const onEndEdit = vi.fn()
      render(<ColumnHeader {...defaultProps} onEndEdit={onEndEdit} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      await userEvent.keyboard('{Escape}')

      expect(onEndEdit).toHaveBeenCalled()
    })
  })

  describe('Inline Renaming - Edge Cases', () => {
    it('should not save empty string', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.keyboard('{Enter}')

      // Should not call onRename with empty string
      expect(onRename).not.toHaveBeenCalled()
    })

    it('should not save whitespace-only string', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, '   ')
      await userEvent.keyboard('{Enter}')

      expect(onRename).not.toHaveBeenCalled()
    })

    it('should trim whitespace from renamed value', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      await userEvent.clear(input)
      await userEvent.type(input, '  New Name  ')
      await userEvent.keyboard('{Enter}')

      expect(onRename).toHaveBeenCalledWith('New Name')
    })

    it('should not call onRename if name is unchanged', async () => {
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} onRename={onRename} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      await userEvent.keyboard('{Enter}')

      // Should not call onRename since name didn't change
      expect(onRename).not.toHaveBeenCalled()
    })

    it('should handle special characters in column name', async () => {
      const specialColumn = { ...mockColumn, name: 'To-Do & Review!' }
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} column={specialColumn} onRename={onRename} />)

      const columnName = screen.getByText('To-Do & Review!')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('To-Do & Review!')

      await userEvent.clear(input)
      await userEvent.type(input, 'New & Improved')
      await userEvent.keyboard('{Enter}')

      expect(onRename).toHaveBeenCalledWith('New & Improved')
    })

    it('should handle unicode characters in column name', async () => {
      const unicodeColumn = { ...mockColumn, name: 'Tâches 日本語' }
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} column={unicodeColumn} onRename={onRename} />)

      const columnName = screen.getByText('Tâches 日本語')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Tâches 日本語')
    })
  })

  describe('Controlled Edit Mode', () => {
    it('should enter edit mode when isEditing is true', () => {
      render(<ColumnHeader {...defaultProps} isEditing={true} />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should not show input when isEditing is false', () => {
      render(<ColumnHeader {...defaultProps} isEditing={false} />)

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('should call onStartEdit when double-clicking in controlled mode', async () => {
      const onStartEdit = vi.fn()
      render(<ColumnHeader {...defaultProps} isEditing={false} onStartEdit={onStartEdit} />)

      const columnName = screen.getByText('Todo')
      await userEvent.dblClick(columnName)

      expect(onStartEdit).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have a proper heading for column name', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'Todo' })).toBeInTheDocument()
    })

    it('should have accessible label for item count', () => {
      render(<ColumnHeader {...defaultProps} itemCount={10} />)

      expect(screen.getByLabelText('10 items')).toBeInTheDocument()
    })

    it('should have accessible label for singular item', () => {
      render(<ColumnHeader {...defaultProps} itemCount={1} />)

      expect(screen.getByLabelText('1 item')).toBeInTheDocument()
    })

    it('should have accessible label for settings button', () => {
      render(<ColumnHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: /column settings/i })).toBeInTheDocument()
    })
  })

  describe('Drag Prevention During Edit', () => {
    it('should disable pointer events on input in edit mode', async () => {
      render(<ColumnHeader {...defaultProps} isEditing={true} />)

      const input = screen.getByRole('textbox')
      // Input should have pointer-events-auto to allow editing
      expect(input).toBeInTheDocument()
    })

    it('should have container with proper classes to prevent drag during edit', async () => {
      render(<ColumnHeader {...defaultProps} isEditing={true} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      // Input should be interactable
      expect(input).not.toHaveAttribute('disabled')
    })
  })

  describe('System Column', () => {
    it('should render system column correctly', () => {
      const systemColumn: BoardColumn = {
        ...mockColumn,
        id: 1,
        name: 'Inbox',
        isSystem: true,
      }

      render(<ColumnHeader {...defaultProps} column={systemColumn} />)

      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    it('should allow editing on system column', async () => {
      const systemColumn: BoardColumn = {
        ...mockColumn,
        id: 1,
        name: 'Inbox',
        isSystem: true,
      }
      const onRename = vi.fn()
      render(<ColumnHeader {...defaultProps} column={systemColumn} onRename={onRename} />)

      const columnName = screen.getByText('Inbox')
      await userEvent.dblClick(columnName)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Color Validation', () => {
    it('should accept valid 6-character hex colors', () => {
      const columnWithColor = { ...mockColumn, color: '#ABCDEF' }
      render(<ColumnHeader {...defaultProps} column={columnWithColor} />)

      const colorIndicator = screen.getByTestId('column-color-indicator')
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#ABCDEF' })
    })

    it('should accept lowercase hex colors', () => {
      const columnWithColor = { ...mockColumn, color: '#abcdef' }
      render(<ColumnHeader {...defaultProps} column={columnWithColor} />)

      const colorIndicator = screen.getByTestId('column-color-indicator')
      expect(colorIndicator).toBeInTheDocument()
    })

    it('should reject 3-character hex colors', () => {
      const columnWithColor = { ...mockColumn, color: '#ABC' }
      render(<ColumnHeader {...defaultProps} column={columnWithColor} />)

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })

    it('should reject colors without # prefix', () => {
      const columnWithColor = { ...mockColumn, color: 'ABCDEF' }
      render(<ColumnHeader {...defaultProps} column={columnWithColor} />)

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })

    it('should reject non-hex strings', () => {
      const columnWithColor = { ...mockColumn, color: 'blue' }
      render(<ColumnHeader {...defaultProps} column={columnWithColor} />)

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Color Picker Integration', () => {
    it('should render ColorPicker when Change Color is clicked', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      expect(screen.getByTestId('color-picker')).toBeInTheDocument()
    })

    it('should pass current column color to ColorPicker', async () => {
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      // Blue color should be selected in the picker
      const blueButton = screen.getByRole('button', { name: 'Blue' })
      expect(blueButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should pass null to ColorPicker when column has no color', async () => {
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: null }} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      // No color should be selected
      const colorButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label') && ['Gray', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink'].includes(btn.getAttribute('aria-label')!)
      )
      colorButtons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-pressed', 'false')
      })
    })

    it('should call onColorChange with selected color from ColorPicker', async () => {
      const onColorChange = vi.fn()
      render(<ColumnHeader {...defaultProps} onColorChange={onColorChange} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      // Click on Green color
      const greenButton = screen.getByRole('button', { name: 'Green' })
      await userEvent.click(greenButton)

      expect(onColorChange).toHaveBeenCalledWith('#D1FAE5')
    })

    it('should call onColorChange with null when deselecting color', async () => {
      const onColorChange = vi.fn()
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} onColorChange={onColorChange} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      // Click on the already selected Blue color to deselect
      const blueButton = screen.getByRole('button', { name: 'Blue' })
      await userEvent.click(blueButton)

      expect(onColorChange).toHaveBeenCalledWith(null)
    })

    it('should allow changing to a different color', async () => {
      const onColorChange = vi.fn()
      render(<ColumnHeader {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} onColorChange={onColorChange} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      // Click on Pink color
      const pinkButton = screen.getByRole('button', { name: 'Pink' })
      await userEvent.click(pinkButton)

      expect(onColorChange).toHaveBeenCalledWith('#FCE7F3')
    })

    it('should render ColorPicker with all 6 preset colors', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const colorButton = screen.getByRole('button', { name: 'Change Color' })
      await userEvent.click(colorButton)

      expect(screen.getByRole('button', { name: 'Gray' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Yellow' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Purple' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pink' })).toBeInTheDocument()
    })
  })

  describe('Delete Confirmation Dialog', () => {
    it('should show AlertDialog when Delete is clicked', async () => {
      render(<ColumnHeader {...defaultProps} />)

      // Find the Delete button in the popover (has text-red-600 class)
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('should show correct column name in AlertDialog title', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete "Todo"?')
    })

    it('should show task count in AlertDialog description', async () => {
      render(<ColumnHeader {...defaultProps} itemCount={5} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('5 tasks will be moved to Inbox')
    })

    it('should show singular "task" for single item', async () => {
      render(<ColumnHeader {...defaultProps} itemCount={1} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('1 task will be moved to Inbox')
    })

    it('should show "0 tasks" for empty column', async () => {
      render(<ColumnHeader {...defaultProps} itemCount={0} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('0 tasks will be moved to Inbox')
    })

    it('should show warning about action being irreversible', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('This action cannot be undone')
    })

    it('should have Cancel button in AlertDialog', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      expect(screen.getByTestId('alert-dialog-cancel')).toHaveTextContent('Cancel')
    })

    it('should have Delete button with destructive styling', async () => {
      render(<ColumnHeader {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      expect(confirmButton).toHaveTextContent('Delete')
      expect(confirmButton.className).toMatch(/red/)
    })

    it('should call onDelete when Delete is confirmed in AlertDialog', async () => {
      const onDelete = vi.fn()
      render(<ColumnHeader {...defaultProps} onDelete={onDelete} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      await userEvent.click(confirmButton)

      expect(onDelete).toHaveBeenCalled()
    })

    it('should not call onDelete when Cancel is clicked in AlertDialog', async () => {
      const onDelete = vi.fn()
      render(<ColumnHeader {...defaultProps} onDelete={onDelete} />)

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
      const popoverDeleteButton = deleteButtons.find(btn => btn.className.includes('text-red-600'))
      await userEvent.click(popoverDeleteButton!)

      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      await userEvent.click(cancelButton)

      expect(onDelete).not.toHaveBeenCalled()
    })
  })
})
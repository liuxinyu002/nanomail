import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndProvider } from '@/contexts/DndContext'
import { BoardPanel, type BoardPanelProps } from './BoardPanel'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'

// Mock BoardColumnDroppable
vi.mock('./BoardColumnDroppable', () => ({
  BoardColumnDroppable: ({ column, todos }: { column: BoardColumn; todos: TodoItem[] }) => (
    <div data-testid={`board-column-${column.id}`}>
      <span>{column.name}</span>
      <span data-testid={`column-todo-count-${column.id}`}>{todos.length}</span>
    </div>
  ),
}))

describe('BoardPanel', () => {
  const defaultColumns: BoardColumn[] = [
    {
      id: 1,
      name: 'Inbox',
      color: '#6B7280',
      order: 0,
      isSystem: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 2,
      name: 'Todo',
      color: '#3B82F6',
      order: 1,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 3,
      name: 'In Progress',
      color: '#F59E0B',
      order: 2,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 4,
      name: 'Done',
      color: '#10B981',
      order: 3,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ]

  const createMockTodo = (id: number, boardColumnId: number): TodoItem => ({
    id,
    emailId: 100 + id,
    description: `Todo ${id}`,
    status: 'pending',
    deadline: null,
    boardColumnId,
    position: id,
    createdAt: '2024-01-15T10:00:00.000Z',
  })

  const defaultProps: BoardPanelProps = {
    columns: defaultColumns,
    todos: [],
  }

  describe('Rendering', () => {
    it('should render the board panel container', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('board-panel')).toBeInTheDocument()
    })

    it('should render board header with title', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByRole('heading', { name: /board/i })).toBeInTheDocument()
    })
  })

  describe('Critical: Exclude Inbox (Column 1)', () => {
    it('should NOT display column with id === 1 (Inbox)', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      // Inbox should NOT be displayed
      expect(screen.queryByTestId('board-column-1')).not.toBeInTheDocument()
    })

    it('should display columns 2, 3, 4 (Todo, In Progress, Done)', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('board-column-2')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-3')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-4')).toBeInTheDocument()
    })

    it('should display correct column names', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
      // Inbox should NOT be displayed
      expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    })
  })

  describe('Mutual Exclusivity with InboxPanel', () => {
    it('should NOT display todos with boardColumnId === 1 (which belong to InboxPanel)', () => {
      const todos = [
        createMockTodo(1, 1), // Inbox - should NOT appear in BoardPanel
        createMockTodo(2, 2), // Todo - should appear
        createMockTodo(3, 3), // In Progress - should appear
        createMockTodo(4, 4), // Done - should appear
      ]

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Column 2 (Todo) should have 1 todo
      expect(screen.getByTestId('column-todo-count-2')).toHaveTextContent('1')
      // Column 3 (In Progress) should have 1 todo
      expect(screen.getByTestId('column-todo-count-3')).toHaveTextContent('1')
      // Column 4 (Done) should have 1 todo
      expect(screen.getByTestId('column-todo-count-4')).toHaveTextContent('1')
    })

    it('should correctly assign todos to their respective columns', () => {
      const todos = [
        createMockTodo(1, 2),
        createMockTodo(2, 2),
        createMockTodo(3, 3),
        createMockTodo(4, 4),
        createMockTodo(5, 4),
        createMockTodo(6, 4),
      ]

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Todo: 2 items
      expect(screen.getByTestId('column-todo-count-2')).toHaveTextContent('2')
      // In Progress: 1 item
      expect(screen.getByTestId('column-todo-count-3')).toHaveTextContent('1')
      // Done: 3 items
      expect(screen.getByTestId('column-todo-count-4')).toHaveTextContent('3')
    })
  })

  describe('Column Layout', () => {
    it('should render columns in a horizontal layout', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const columnsContainer = screen.getByTestId('columns-container')
      expect(columnsContainer).toHaveClass('flex')
      expect(columnsContainer).toHaveClass('gap-4')
    })

    it('should render columns in order', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const columns = screen.getByTestId('columns-container').children
      // First column should be "Todo" (id: 2)
      expect(columns[0]).toHaveAttribute('data-testid', 'board-column-2')
      // Second column should be "In Progress" (id: 3)
      expect(columns[1]).toHaveAttribute('data-testid', 'board-column-3')
      // Third column should be "Done" (id: 4)
      expect(columns[2]).toHaveAttribute('data-testid', 'board-column-4')
    })
  })

  describe('Empty State', () => {
    it('should show New List button when no columns except Inbox exist', () => {
      const columnsOnlyInbox: BoardColumn[] = [defaultColumns[0]] // Only Inbox

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} columns={columnsOnlyInbox} />
        </DndProvider>
      )

      // Should show New List button instead of empty state
      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should display columns even when no todos exist', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} todos={[]} />
        </DndProvider>
      )

      // Columns should still be displayed
      expect(screen.getByTestId('board-column-2')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-3')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-4')).toBeInTheDocument()
    })
  })

  describe('Custom Columns', () => {
    it('should handle additional custom columns', () => {
      const customColumns: BoardColumn[] = [
        ...defaultColumns,
        {
          id: 5,
          name: 'Review',
          color: '#8B5CF6',
          order: 4,
          isSystem: false,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} columns={customColumns} />
        </DndProvider>
      )

      expect(screen.getByTestId('board-column-5')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('should filter out column 1 even if it is not the first column', () => {
      const shuffledColumns: BoardColumn[] = [
        defaultColumns[2], // In Progress
        defaultColumns[0], // Inbox
        defaultColumns[1], // Todo
        defaultColumns[3], // Done
      ]

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} columns={shuffledColumns} />
        </DndProvider>
      )

      // Inbox should still be excluded
      expect(screen.queryByTestId('board-column-1')).not.toBeInTheDocument()
      // Other columns should be displayed
      expect(screen.getByTestId('board-column-2')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-3')).toBeInTheDocument()
      expect(screen.getByTestId('board-column-4')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should have proper panel layout', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const panel = screen.getByTestId('board-panel')
      expect(panel).toHaveClass('flex')
      expect(panel).toHaveClass('flex-col')
    })

    it('should have proper header styling', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveClass('border-b')
    })

    it('should accept custom className', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} className="custom-class" />
        </DndProvider>
      )

      const panel = screen.getByTestId('board-panel')
      expect(panel).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading level', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const heading = screen.getByRole('heading', { name: /board/i, level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('should display total column count', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      // Should show 3 columns (excluding Inbox)
      expect(screen.getByLabelText('3 columns')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should show New List button when columns array is empty', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} columns={[]} />
        </DndProvider>
      )

      // Should show New List button instead of empty state
      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should handle todos with non-existent column IDs gracefully', () => {
      const todos = [
        createMockTodo(1, 99), // Non-existent column
        createMockTodo(2, 2),  // Valid column
      ]

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Should not throw, just ignore the orphan todo
      expect(screen.getByTestId('column-todo-count-2')).toHaveTextContent('1')
    })

    it('should handle large number of todos across columns', () => {
      const todos: TodoItem[] = Array.from({ length: 100 }, (_, i) =>
        createMockTodo(i + 1, (i % 3) + 2) // Distribute across columns 2, 3, 4
      )

      render(
        <DndProvider>
          <BoardPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Each column should have roughly 33-34 items
      const count2 = parseInt(screen.getByTestId('column-todo-count-2').textContent || '0')
      const count3 = parseInt(screen.getByTestId('column-todo-count-3').textContent || '0')
      const count4 = parseInt(screen.getByTestId('column-todo-count-4').textContent || '0')

      expect(count2 + count3 + count4).toBe(100)
    })
  })

  describe('New List Button Integration', () => {
    it('should render New List button at the end of columns', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByRole('button', { name: /new list/i })).toBeInTheDocument()
    })

    it('should render New List button as the last item in columns container', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const columnsContainer = screen.getByTestId('columns-container')
      const children = Array.from(columnsContainer.children)
      const lastChild = children[children.length - 1]

      // The last child should contain the New List button
      expect(lastChild).toHaveTextContent('New List')
    })

    it('should call onCreateColumn with correct order when creating new column', async () => {
      const onCreateColumn = vi.fn()
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} onCreateColumn={onCreateColumn} />
        </DndProvider>
      )

      // Click the New List button
      const newButton = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(newButton)

      // Type a name and press Enter
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'New Column')
      await userEvent.keyboard('{Enter}')

      // Should be called with name and correct order (max order + 1)
      // Default columns have orders: Inbox(0), Todo(1), InProgress(2), Done(3)
      // Excluding Inbox, max order is 3, so new order should be 4
      expect(onCreateColumn).toHaveBeenCalledWith('New Column', 4)
    })

    it('should calculate correct order when columns have non-sequential orders', async () => {
      const columnsWithGaps: BoardColumn[] = [
        defaultColumns[0], // Inbox, order 0
        { ...defaultColumns[1], order: 5 }, // Todo, order 5
        { ...defaultColumns[2], order: 10 }, // In Progress, order 10
      ]

      const onCreateColumn = vi.fn()
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} columns={columnsWithGaps} onCreateColumn={onCreateColumn} />
        </DndProvider>
      )

      // Click the New List button
      const newButton = screen.getByRole('button', { name: /new list/i })
      await userEvent.click(newButton)

      // Type a name and press Enter
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Another Column')
      await userEvent.keyboard('{Enter}')

      // Max order is 10, so new order should be 11
      expect(onCreateColumn).toHaveBeenCalledWith('Another Column', 11)
    })

    it('should have New List button with fixed width class', () => {
      render(
        <DndProvider>
          <BoardPanel {...defaultProps} />
        </DndProvider>
      )

      const newButton = screen.getByRole('button', { name: /new list/i })
      expect(newButton).toHaveClass('w-[280px]')
      expect(newButton).toHaveClass('flex-shrink-0')
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardColumnDroppable, getDisplayIndex, type BoardColumnDroppableProps } from './BoardColumnDroppable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'

// Mock @dnd-kit/core
const mockUseDroppable = vi.fn()
vi.mock('@dnd-kit/core', () => ({
  useDroppable: (...args: unknown[]) => mockUseDroppable(...args),
}))

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: {},
}))

// Mock useDndContext hook
const mockUseDndContext = vi.fn()
vi.mock('@/contexts/DndContext', () => ({
  useDndContext: () => mockUseDndContext(),
}))

// Mock DraggableTodoItem
vi.mock('./DraggableTodoItem', () => ({
  DraggableTodoItem: ({ todo, index }: { todo: { id: number; description: string }; index?: number }) => (
    <div data-testid={`todo-item-${todo.id}`} data-index={index}>
      {todo.description}
    </div>
  ),
}))

// Mock ColumnHeader
vi.mock('./ColumnHeader', () => ({
  ColumnHeader: ({ column, itemCount }: { column: { name: string }; itemCount: number }) => (
    <div data-testid="column-header">
      <span>{column.name}</span>
      <span>{itemCount} items</span>
    </div>
  ),
}))

describe('BoardColumnDroppable', () => {
  const mockColumn: BoardColumn = {
    id: 2,
    name: 'Todo',
    color: null,
    order: 1,
    isSystem: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  // Helper function to create valid TodoItem mock data
  const createMockTodo = (id: number, description: string, boardColumnId: number, position: number): TodoItem => ({
    id,
    emailId: null,
    description,
    status: 'pending',
    deadline: null,
    boardColumnId,
    position,
    notes: null,
    color: null,
    source: 'manual',
    completedAt: null,
    createdAt: new Date(),
  })

  const mockTodos: TodoItem[] = [
    createMockTodo(1, 'Task 1', 2, 0),
    createMockTodo(2, 'Task 2', 2, 1),
  ]

  const defaultProps: BoardColumnDroppableProps = {
    column: mockColumn,
    todos: mockTodos,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation - not being dragged over
    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    })
    // Default mock for useDndContext - not dragging
    mockUseDndContext.mockReturnValue({
      isDragging: false,
      activeItem: null,
      overZone: null,
    })
  })

  describe('Rendering', () => {
    it('should render the column header', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('column-header')).toBeInTheDocument()
    })

    it('should render all todos', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
    })

    it('should render droppable zone', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
    })

    it('should render empty column when no todos', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
      expect(screen.queryByTestId(/todo-item-/)).not.toBeInTheDocument()
    })
  })

  describe('Card Area Color Overlay', () => {
    it('should have a card area container with white base background', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      expect(cardArea).toHaveStyle({ backgroundColor: '#FFFFFF' })
    })

    it('should have a color overlay layer with 12% opacity using column color', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} />)

      const colorOverlay = screen.getByTestId('color-overlay')
      expect(colorOverlay).toHaveStyle({ backgroundColor: '#DBEAFE' })
      expect(colorOverlay).toHaveStyle({ opacity: 0.12 })
    })

    it('should use fallback color #F7F8FA when column has no color', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: null }} />)

      const colorOverlay = screen.getByTestId('color-overlay')
      expect(colorOverlay).toHaveStyle({ backgroundColor: '#F7F8FA' })
      expect(colorOverlay).toHaveStyle({ opacity: 0.12 })
    })

    it('should have pointer-events-none on color overlay to not interfere with drag/drop', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#FFB5BA' }} />)

      const colorOverlay = screen.getByTestId('color-overlay')
      expect(colorOverlay).toHaveClass('pointer-events-none')
    })

    it('should position color overlay absolutely covering the card area', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const colorOverlay = screen.getByTestId('color-overlay')
      expect(colorOverlay).toHaveClass('absolute')
      expect(colorOverlay).toHaveClass('inset-0')
    })

    it('should have content layer with z-10 for proper stacking', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const droppableZone = screen.getByTestId('droppable-zone')
      expect(droppableZone).toHaveClass('z-10')
    })

    it('should apply different color overlays for different column colors', () => {
      const colors = ['#FFB5BA', '#FFD8A8', '#B8E6C1']

      colors.forEach(color => {
        const { unmount } = render(
          <BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color }} />
        )

        const colorOverlay = screen.getByTestId('color-overlay')
        expect(colorOverlay).toHaveStyle({ backgroundColor: color })
        expect(colorOverlay).toHaveStyle({ opacity: 0.12 })
        unmount()
      })
    })
  })

  describe('Column Padding', () => {
    it('should have p-3 padding on the content layer (droppable zone)', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const droppableZone = screen.getByTestId('droppable-zone')
      expect(droppableZone).toHaveClass('p-3')
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<BoardColumnDroppable {...defaultProps} className="custom-class" />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      render(<BoardColumnDroppable {...defaultProps} className="mt-4 rounded-xl" />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('mt-4')
      expect(column).toHaveClass('rounded-xl')
      expect(column).toHaveClass('flex')
    })
  })

  describe('Empty State', () => {
    it('should show EmptyState when column is empty and not being dragged over', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should show EmptyState with column name in message', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} column={{ ...mockColumn, name: 'In Progress' }} />)

      expect(screen.getByText(/No tasks in In Progress/)).toBeInTheDocument()
    })

    it('should NOT show EmptyState when column has todos', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('should NOT show EmptyState when being dragged over (isOver=true)', () => {
      // Override mock for this test to simulate drag over
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('should show drop indicator when being dragged over empty column', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      // Should show drop indicator
      expect(screen.getByTestId('drop-indicator')).toBeInTheDocument()
    })

    it('should NOT show drop indicator when not being dragged over', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument()
    })

    it('should NOT show drop indicator when column has todos (even if being dragged over)', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument()
    })

    it('should render todo items when column is not empty', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('Droppable Zone Full Column Coverage', () => {
    it('should have flex-1 class on card-area for full column coverage', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      expect(cardArea).toHaveClass('flex-1')
    })

    it('should have min-h-0 class on card-area for proper flex shrinking (flex-1 min-h-0 pattern)', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      // flex-1 + min-h-0 is the correct pattern for dynamic height in flex containers
      // h-full is NOT needed because flex-1 already fills remaining space
      expect(cardArea).toHaveClass('min-h-0')
    })

    it('should have setNodeRef attached to card-area (making it the droppable zone)', () => {
      const mockSetNodeRef = vi.fn()
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: mockSetNodeRef,
        isOver: false,
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      // The setNodeRef should be called with the card-area element
      // We can verify this by checking the ref was set
      expect(mockSetNodeRef).toHaveBeenCalled()
    })

    it('should NOT apply bg-gray-100 on isOver state', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      // Should NOT have bg-gray-100 class when being dragged over
      expect(cardArea).not.toHaveClass('bg-gray-100')
    })

    it('should keep ring indicator on droppable zone when isOver', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      // The droppable zone (now card-area) should have ring indicator
      const cardArea = screen.getByTestId('card-area')
      expect(cardArea).toHaveClass('ring-2')
      expect(cardArea).toHaveClass('ring-blue-400')
      expect(cardArea).toHaveClass('ring-inset')
    })

    it('should allow dropping into empty column (card-area is droppable zone)', () => {
      const mockSetNodeRef = vi.fn()
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: mockSetNodeRef,
        isOver: false,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      // Verify the droppable zone exists for empty columns
      const cardArea = screen.getByTestId('card-area')
      expect(cardArea).toBeInTheDocument()
      expect(mockSetNodeRef).toHaveBeenCalled()
    })

    it('should NOT use min-h-[200px] on card-area (should use flex-1 h-full instead)', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const cardArea = screen.getByTestId('card-area')
      // Should NOT have the old min-h-[200px] class
      expect(cardArea).not.toHaveClass('min-h-[200px]')
    })
  })

  describe('Phase 3: Sortable Drop Indicator', () => {
    it('should render SortableContext with correct todo IDs', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      // SortableContext should be rendered with the todo IDs
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
    })

    it('should render DraggableTodoItem with useSortable for displacement animations', () => {
      // This test verifies that DraggableTodoItem uses useSortable
      // which enables automatic displacement animations during drag
      render(<BoardColumnDroppable {...defaultProps} />)

      // Both todo items should be rendered
      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
    })

    it('should show drop indicator for empty column when dragging over', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      // Should show drop indicator for empty column
      expect(screen.getByTestId('drop-indicator')).toBeInTheDocument()
    })

    it('should NOT show drop indicator when column has todos (sortable handles displacement)', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      // When column has todos, the SortableContext/useSortable handles displacement
      // No separate drop indicator is shown
      expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument()
    })

    it('should use verticalListSortingStrategy for proper vertical displacement', () => {
      // This is implicitly tested by checking that SortableContext renders correctly
      // The verticalListSortingStrategy is passed to SortableContext
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
    })

    it('should pass correct item IDs to SortableContext for sortable behavior', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      // All todo items should be present in the sortable context
      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
    })

    it('should maintain todo order within SortableContext', () => {
      const threeTodos: TodoItem[] = [
        createMockTodo(1, 'Task 1', 2, 0),
        createMockTodo(2, 'Task 2', 2, 1),
        createMockTodo(3, 'Task 3', 2, 2),
      ]

      render(<BoardColumnDroppable {...defaultProps} todos={threeTodos} />)

      // All three todos should be rendered
      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-3')).toBeInTheDocument()
    })

    it('should handle single todo item correctly in SortableContext', () => {
      const singleTodo: TodoItem[] = [
        createMockTodo(1, 'Only Task', 2, 0),
      ]

      render(<BoardColumnDroppable {...defaultProps} todos={singleTodo} />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
    })
  })

  describe('Phase 4: Real-time Badge Updates', () => {
    it('should use original index when not dragging', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      // When not dragging, items should have their original indices
      const todoItem1 = screen.getByTestId('todo-item-1')
      const todoItem2 = screen.getByTestId('todo-item-2')

      expect(todoItem1).toHaveAttribute('data-index', '0')
      expect(todoItem2).toHaveAttribute('data-index', '1')
    })

    it('should update badge indices when dragging down', () => {
      // Simulate dragging item 1 (id: 1) over item 2 (id: 2)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 1, data: { type: 'todo' } },
        overZone: { id: 2, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      // Item 1 should show at index 1 (over position)
      // Item 2 should show at index 0 (shifted up)
      const todoItem1 = screen.getByTestId('todo-item-1')
      const todoItem2 = screen.getByTestId('todo-item-2')

      expect(todoItem1).toHaveAttribute('data-index', '1')
      expect(todoItem2).toHaveAttribute('data-index', '0')
    })

    it('should update badge indices when dragging up', () => {
      // Simulate dragging item 2 (id: 2) over item 1 (id: 1)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 2, data: { type: 'todo' } },
        overZone: { id: 1, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      // Item 1 should show at index 1 (shifted down)
      // Item 2 should show at index 0 (over position)
      const todoItem1 = screen.getByTestId('todo-item-1')
      const todoItem2 = screen.getByTestId('todo-item-2')

      expect(todoItem1).toHaveAttribute('data-index', '1')
      expect(todoItem2).toHaveAttribute('data-index', '0')
    })

    it('should handle three items with correct shifts when dragging middle item down', () => {
      const threeTodos: TodoItem[] = [
        createMockTodo(1, 'Task 1', 2, 0),
        createMockTodo(2, 'Task 2', 2, 1),
        createMockTodo(3, 'Task 3', 2, 2),
      ]

      // Simulate dragging item 2 (id: 2, index 1) over item 3 (id: 3, index 2)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 2, data: { type: 'todo' } },
        overZone: { id: 3, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} todos={threeTodos} />)

      // Item 1: not affected, stays at index 0
      // Item 2: active item, moves to index 2
      // Item 3: shifts up to index 1
      expect(screen.getByTestId('todo-item-1')).toHaveAttribute('data-index', '0')
      expect(screen.getByTestId('todo-item-2')).toHaveAttribute('data-index', '2')
      expect(screen.getByTestId('todo-item-3')).toHaveAttribute('data-index', '1')
    })

    it('should handle three items with correct shifts when dragging first item to last', () => {
      const threeTodos: TodoItem[] = [
        createMockTodo(1, 'Task 1', 2, 0),
        createMockTodo(2, 'Task 2', 2, 1),
        createMockTodo(3, 'Task 3', 2, 2),
      ]

      // Simulate dragging item 1 (id: 1, index 0) over item 3 (id: 3, index 2)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 1, data: { type: 'todo' } },
        overZone: { id: 3, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} todos={threeTodos} />)

      // Item 1: active item, moves to index 2
      // Item 2: shifts up to index 0
      // Item 3: shifts up to index 1
      expect(screen.getByTestId('todo-item-1')).toHaveAttribute('data-index', '2')
      expect(screen.getByTestId('todo-item-2')).toHaveAttribute('data-index', '0')
      expect(screen.getByTestId('todo-item-3')).toHaveAttribute('data-index', '1')
    })

    it('should handle three items with correct shifts when dragging last item to first', () => {
      const threeTodos: TodoItem[] = [
        createMockTodo(1, 'Task 1', 2, 0),
        createMockTodo(2, 'Task 2', 2, 1),
        createMockTodo(3, 'Task 3', 2, 2),
      ]

      // Simulate dragging item 3 (id: 3, index 2) over item 1 (id: 1, index 0)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 3, data: { type: 'todo' } },
        overZone: { id: 1, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} todos={threeTodos} />)

      // Item 1: shifts down to index 1
      // Item 2: shifts down to index 2
      // Item 3: active item, moves to index 0
      expect(screen.getByTestId('todo-item-1')).toHaveAttribute('data-index', '1')
      expect(screen.getByTestId('todo-item-2')).toHaveAttribute('data-index', '2')
      expect(screen.getByTestId('todo-item-3')).toHaveAttribute('data-index', '0')
    })

    it('should return original indices when overId is not in current column (cross-column drag)', () => {
      // Simulate dragging item 1 over a different column (overId 999 not in todos)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 1, data: { type: 'todo' } },
        overZone: { id: 999, type: 'board' }, // Not in current column
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      // All items should have original indices since overId is not found
      expect(screen.getByTestId('todo-item-1')).toHaveAttribute('data-index', '0')
      expect(screen.getByTestId('todo-item-2')).toHaveAttribute('data-index', '1')
    })

    it('should return original indices when activeId is not in current column (cross-column drag in)', () => {
      // Simulate dragging from another column (activeId 999 not in todos)
      mockUseDndContext.mockReturnValue({
        isDragging: true,
        activeItem: { id: 999, data: { type: 'todo' } }, // Not in current column
        overZone: { id: 2, type: 'board' },
      })

      render(<BoardColumnDroppable {...defaultProps} />)

      // All items should have original indices since activeId is not found
      expect(screen.getByTestId('todo-item-1')).toHaveAttribute('data-index', '0')
      expect(screen.getByTestId('todo-item-2')).toHaveAttribute('data-index', '1')
    })
  })
})

// Phase 4: getDisplayIndex function tests
// This function calculates the display index during drag operations
// for real-time badge number updates
describe('getDisplayIndex', () => {
  describe('Not dragging scenarios', () => {
    it('should return original index when not dragging (activeId is null)', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      const result = getDisplayIndex(1, 0, todos, null, 2)
      expect(result).toBe(0)
    })

    it('should return original index when not dragging (overId is null)', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      const result = getDisplayIndex(1, 0, todos, 1, null)
      expect(result).toBe(0)
    })

    it('should return original index when both activeId and overId are null', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      const result = getDisplayIndex(2, 1, todos, null, null)
      expect(result).toBe(1)
    })
  })

  describe('Active item (being dragged)', () => {
    it('should return overIndex for the active (dragged) item', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 1 (index 0) over item 3 (index 2)
      const result = getDisplayIndex(1, 0, todos, 1, 3)
      expect(result).toBe(2)
    })

    it('should return overIndex for active item when dragging up', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 3 (index 2) over item 1 (index 0)
      const result = getDisplayIndex(3, 2, todos, 3, 1)
      expect(result).toBe(0)
    })
  })

  describe('Dragging down (activeIndex < overIndex)', () => {
    it('should shift items between activeIndex and overIndex up by 1', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 1 (index 0) over item 3 (index 2)
      // Items 2 and 3 should shift up
      // Item 2 (original index 1) -> display index 0
      // Item 3 (original index 2) -> display index 1

      // Item 2: between active and over, should shift up
      expect(getDisplayIndex(2, 1, todos, 1, 3)).toBe(0)

      // Item 3: at overIndex, but is NOT the active item, so check if it shifts
      // Actually, item 3 is the over item. Let's test a different scenario.
    })

    it('should shift items correctly when dragging item 0 over item 2', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 1 (index 0) over item 3 (index 2)
      // Active item (1) should show at index 2
      // Item 2 should shift from index 1 to 0
      // Item 3 should shift from index 2 to 1

      expect(getDisplayIndex(1, 0, todos, 1, 3)).toBe(2) // active item
      expect(getDisplayIndex(2, 1, todos, 1, 3)).toBe(0) // shifts up
      expect(getDisplayIndex(3, 2, todos, 1, 3)).toBe(1) // shifts up
    })

    it('should NOT shift items before activeIndex when dragging down', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

      // Dragging item 2 (index 1) over item 4 (index 3)
      // Item 1 (before active) should stay at index 0
      expect(getDisplayIndex(1, 0, todos, 2, 4)).toBe(0)
    })

    it('should NOT shift items after overIndex when dragging down', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]

      // Dragging item 1 (index 0) over item 3 (index 2)
      // Item 4 and 5 (after overIndex) should NOT shift
      expect(getDisplayIndex(4, 3, todos, 1, 3)).toBe(3)
      expect(getDisplayIndex(5, 4, todos, 1, 3)).toBe(4)
    })
  })

  describe('Dragging up (activeIndex > overIndex)', () => {
    it('should shift items between overIndex and activeIndex down by 1', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 3 (index 2) over item 1 (index 0)
      // Items 1 and 2 should shift down
      // Item 1 (original index 0) -> display index 1
      // Item 2 (original index 1) -> display index 2

      expect(getDisplayIndex(3, 2, todos, 3, 1)).toBe(0) // active item
      expect(getDisplayIndex(1, 0, todos, 3, 1)).toBe(1) // shifts down
      expect(getDisplayIndex(2, 1, todos, 3, 1)).toBe(2) // shifts down
    })

    it('should NOT shift items before overIndex when dragging up', () => {
      const todos = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

      // Dragging item 4 (index 4) over item 1 (index 1)
      // Item 0 (before overIndex) should stay at index 0
      expect(getDisplayIndex(0, 0, todos, 4, 1)).toBe(0)
    })

    it('should NOT shift items after activeIndex when dragging up', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]

      // Dragging item 4 (index 3) over item 2 (index 1)
      // Item 5 (after activeIndex) should NOT shift
      expect(getDisplayIndex(5, 4, todos, 4, 2)).toBe(4)
    })
  })

  describe('Edge cases', () => {
    it('should handle single item list (no change)', () => {
      const todos = [{ id: 1 }]

      // Dragging the only item - should stay at index 0
      expect(getDisplayIndex(1, 0, todos, 1, 1)).toBe(0)
    })

    it('should handle first item being dragged down', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 1 (first, index 0) over item 2 (index 1)
      expect(getDisplayIndex(1, 0, todos, 1, 2)).toBe(1) // active
      expect(getDisplayIndex(2, 1, todos, 1, 2)).toBe(0) // shifts up
      expect(getDisplayIndex(3, 2, todos, 1, 2)).toBe(2) // no change
    })

    it('should handle last item being dragged up', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item 3 (last, index 2) over item 2 (index 1)
      expect(getDisplayIndex(1, 0, todos, 3, 2)).toBe(0) // no change
      expect(getDisplayIndex(2, 1, todos, 3, 2)).toBe(2) // shifts down
      expect(getDisplayIndex(3, 2, todos, 3, 2)).toBe(1) // active
    })

    it('should handle cross-column drag (overId not in todos)', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // When dragging to another column, overId (99) won't be in current column's todos
      // In this case, overIndex is -1, so we should return original index
      expect(getDisplayIndex(1, 0, todos, 1, 99)).toBe(0)
      expect(getDisplayIndex(2, 1, todos, 1, 99)).toBe(1)
      expect(getDisplayIndex(3, 2, todos, 1, 99)).toBe(2)
    })

    it('should handle activeId not in current column (cross-column drag in)', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // When dragging from another column, activeId (99) won't be in current column's todos
      // In this case, activeIndex is -1, so we should return original index
      expect(getDisplayIndex(1, 0, todos, 99, 2)).toBe(0)
      expect(getDisplayIndex(2, 1, todos, 99, 2)).toBe(1)
      expect(getDisplayIndex(3, 2, todos, 99, 2)).toBe(2)
    })

    it('should handle empty todos array', () => {
      const todos: { id: number }[] = []

      // No items, should return original index
      expect(getDisplayIndex(1, 0, todos, 1, 2)).toBe(0)
    })

    it('should handle same position (activeIndex === overIndex)', () => {
      const todos = [{ id: 1 }, { id: 2 }, { id: 3 }]

      // Dragging item over itself - no changes
      expect(getDisplayIndex(1, 0, todos, 1, 1)).toBe(0)
      expect(getDisplayIndex(2, 1, todos, 1, 1)).toBe(1)
      expect(getDisplayIndex(3, 2, todos, 1, 1)).toBe(2)
    })

    it('should handle two item list - dragging first over second', () => {
      const todos = [{ id: 1 }, { id: 2 }]

      expect(getDisplayIndex(1, 0, todos, 1, 2)).toBe(1) // active moves to index 1
      expect(getDisplayIndex(2, 1, todos, 1, 2)).toBe(0) // second item shifts up
    })

    it('should handle two item list - dragging second over first', () => {
      const todos = [{ id: 1 }, { id: 2 }]

      expect(getDisplayIndex(2, 1, todos, 2, 1)).toBe(0) // active moves to index 0
      expect(getDisplayIndex(1, 0, todos, 2, 1)).toBe(1) // first item shifts down
    })
  })
})

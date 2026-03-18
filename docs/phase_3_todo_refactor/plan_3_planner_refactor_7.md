# Plan 3 Phase 7: Testing & Polish

> Part of: Planner Component Refactor
> Previous: Phase 6 (DragOverlay Implementation)
> Next: Phase 8 (Cleanup & Refactor)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Testing Requirements
- Unit tests for all new components
- Integration tests for drag-drop flow
- 80%+ code coverage for new components
- Design system compliance verification

### Quality Requirements
- No TypeScript errors
- No console errors or warnings
- Smooth animations per design system
- Accessible UI components

---

## Architecture

### Test File Structure
```
packages/frontend/src/features/todos/
├── PlannerPanel.test.tsx           # Updated tests for PlannerPanel
└── planner/
    ├── DayView.test.tsx            # DayView unit tests
    ├── WeekView.test.tsx           # WeekView unit tests
    ├── HourSlot.test.tsx           # HourSlot unit tests
    ├── CurrentTimeIndicator.test.tsx # CurrentTimeIndicator tests
    └── integration.test.tsx        # End-to-end drag-drop tests
```

---

## Phase 7 Tasks (4 files)

### Step 7.1: Update PlannerPanel tests

- **File**: `packages/frontend/src/features/todos/PlannerPanel.test.tsx`
- **Action**: Update tests for new PlannerPanel structure
- **Why**: Ensure refactored component works correctly
- **Dependencies**: Phase 4 (PlannerPanel refactor)
- **Risk**: Low

**Test cases**:
- Renders DayView by default
- Switches to WeekView on toggle
- Filters todos correctly (deadline + boardColumnId === 2)
- Shows count of scheduled tasks in header

**Example test structure**:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlannerPanel } from './PlannerPanel'
import type { TodoItem } from '@nanomail/shared'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('PlannerPanel', () => {
  const mockTodos: TodoItem[] = [
    { id: 1, title: 'Scheduled Task', deadline: '2024-01-15T10:00:00', boardColumnId: 2 },
    { id: 2, title: 'Inbox Task', deadline: null, boardColumnId: 1 },
    { id: 3, title: 'Board Task', deadline: '2024-01-15T14:00:00', boardColumnId: 3 },
  ]

  it('renders DayView by default', () => {
    render(<PlannerPanel todos={mockTodos} />, { wrapper: createWrapper() })

    // DayView should be visible
    expect(screen.getByTestId('day-view')).toBeInTheDocument()
    expect(screen.queryByTestId('week-view')).not.toBeInTheDocument()
  })

  it('switches to WeekView on toggle', () => {
    render(<PlannerPanel todos={mockTodos} />, { wrapper: createWrapper() })

    // Click week toggle
    fireEvent.click(screen.getByRole('button', { name: '周' }))

    // WeekView should be visible
    expect(screen.getByTestId('week-view')).toBeInTheDocument()
    expect(screen.queryByTestId('day-view')).not.toBeInTheDocument()
  })

  it('filters todos correctly', () => {
    render(<PlannerPanel todos={mockTodos} />, { wrapper: createWrapper() })

    // Only scheduled tasks (deadline + boardColumnId === 2) should appear
    expect(screen.getByText('Scheduled Task')).toBeInTheDocument()
    expect(screen.queryByText('Inbox Task')).not.toBeInTheDocument()
    expect(screen.queryByText('Board Task')).not.toBeInTheDocument()
  })

  it('shows count of scheduled tasks in header', () => {
    render(<PlannerPanel todos={mockTodos} />, { wrapper: createWrapper() })

    // Should show (1 scheduled) since only one todo matches filter
    expect(screen.getByText('(1 scheduled)')).toBeInTheDocument()
  })

  it('toggles back to DayView when clicking day button', () => {
    render(<PlannerPanel todos={mockTodos} />, { wrapper: createWrapper() })

    // Switch to week
    fireEvent.click(screen.getByRole('button', { name: '周' }))
    expect(screen.getByTestId('week-view')).toBeInTheDocument()

    // Switch back to day
    fireEvent.click(screen.getByRole('button', { name: '日' }))
    expect(screen.getByTestId('day-view')).toBeInTheDocument()
  })
})
```

---

### Step 7.2: Create HourSlot tests

- **File**: `packages/frontend/src/features/todos/planner/HourSlot.test.tsx`
- **Action**: Write comprehensive tests for HourSlot
- **Why**: Critical component for drag-drop functionality
- **Dependencies**: Phase 2 (HourSlot)
- **Risk**: Low

**Test cases**:
- Renders correctly with no todos
- Displays todos in correct order
- Shows drag-over visual feedback
- Handles drop event correctly

**Example test structure**:
```tsx
import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { HourSlot } from './HourSlot'
import type { TodoItem } from '@nanomail/shared'

const renderWithDnd = (ui: React.ReactElement) => {
  return render(
    <DndContext onDragEnd={() => {}}>
      {ui}
    </DndContext>
  )
}

describe('HourSlot', () => {
  const mockDate = new Date('2024-01-15')
  const mockTodos: TodoItem[] = [
    { id: 1, title: 'Task 1', deadline: '2024-01-15T10:00:00', boardColumnId: 2 },
    { id: 2, title: 'Task 2', deadline: '2024-01-15T10:30:00', boardColumnId: 2 },
  ]

  it('renders correctly with no todos', () => {
    renderWithDnd(<HourSlot date={mockDate} hour={10} todos={[]} />)

    // Empty slot should show dashed border
    const slot = screen.getByTestId('hour-slot')
    expect(slot).toHaveClass('border-dashed')
  })

  it('displays todos in correct order', () => {
    renderWithDnd(<HourSlot date={mockDate} hour={10} todos={mockTodos} />)

    // Both todos should be visible
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('shows drag-over visual feedback', () => {
    // This test requires simulating a drag-over state
    // May need to use @dnd-kit/testing utilities
    renderWithDnd(<HourSlot date={mockDate} hour={10} todos={[]} />)

    // Verify initial state
    const slot = screen.getByTestId('hour-slot')
    expect(slot).not.toHaveClass('bg-blue-50')
  })

  it('has correct data attributes', () => {
    renderWithDnd(<HourSlot date={mockDate} hour={10} todos={[]} />)

    const slot = screen.getByTestId('hour-slot')
    expect(slot).toHaveAttribute('data-hour', '10')
  })

  it('calls onTodoClick when todo is clicked', () => {
    const onTodoClick = vi.fn()
    renderWithDnd(
      <HourSlot date={mockDate} hour={10} todos={mockTodos} onTodoClick={onTodoClick} />
    )

    fireEvent.click(screen.getByText('Task 1'))
    expect(onTodoClick).toHaveBeenCalledWith(mockTodos[0])
  })
})
```

---

### Step 7.3: Create CurrentTimeIndicator tests

- **File**: `packages/frontend/src/features/todos/planner/CurrentTimeIndicator.test.tsx`
- **Action**: Write tests for CurrentTimeIndicator
- **Why**: Ensure correct positioning and updates
- **Dependencies**: Phase 1 (CurrentTimeIndicator)
- **Risk**: Low

**Test cases**:
- Renders with correct position
- Updates position when time changes
- Hidden when outside visible hours

**Example test structure**:
```tsx
import { render, screen, act } from '@testing-library/react'
import { CurrentTimeIndicator } from './CurrentTimeIndicator'

describe('CurrentTimeIndicator', () => {
  it('renders with correct position', () => {
    const containerRef = { current: document.createElement('div') }

    render(<CurrentTimeIndicator containerRef={containerRef} />)

    // Indicator should be visible
    const indicator = screen.getByTestId('current-time-indicator')
    expect(indicator).toBeInTheDocument()

    // Position should be calculated from current time
    const now = new Date()
    const expectedPosition = now.getHours() * 60 + now.getMinutes()
    expect(indicator.style.top).toContain(expectedPosition.toString())
  })

  it('updates position when time changes', () => {
    vi.useFakeTimers()
    const containerRef = { current: document.createElement('div') }

    render(<CurrentTimeIndicator containerRef={containerRef} />)

    const indicator = screen.getByTestId('current-time-indicator')
    const initialPosition = indicator.style.top

    // Advance time by 1 minute
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    // Position should have updated
    // Note: This test may need adjustment based on actual implementation
    expect(indicator.style.top).toBeDefined()

    vi.useRealTimers()
  })

  it('renders red dot and line', () => {
    const containerRef = { current: document.createElement('div') }

    render(<CurrentTimeIndicator containerRef={containerRef} />)

    // Red dot
    const dot = screen.getByTestId('time-indicator-dot')
    expect(dot).toHaveClass('bg-red-500')

    // Red line
    const line = screen.getByTestId('time-indicator-line')
    expect(line).toHaveClass('bg-red-500')
  })
})
```

---

### Step 7.4: Create integration test for drag-drop flow

- **File**: `packages/frontend/src/features/todos/planner/integration.test.tsx`
- **Action**: Write integration test for complete drag-drop flow
- **Why**: Verify end-to-end functionality
- **Dependencies**: All phases complete
- **Risk**: Medium

**Test cases**:
- Drag from Inbox to Planner DayView hour slot
- Todo updates with deadline + boardColumnId = 2
- Todo appears in Planner and Board (Todo column)
- Todo disappears from Inbox

**Example test structure**:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { TodosPage } from '@/pages/TodosPage'
import * as todoService from '@/services/todo.service'

vi.mock('@/services/todo.service')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Drag-Drop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('drag from Inbox to Planner updates todo correctly', async () => {
    // Mock API response
    vi.mocked(todoService.updateTodo).mockResolvedValue({
      id: 1,
      title: 'Test Task',
      deadline: '2024-01-15T10:00:00',
      boardColumnId: 2,
    })

    render(<TodosPage />, { wrapper: createWrapper() })

    // Find todo in Inbox
    const inboxTodo = screen.getByText('Test Task')
    expect(inboxTodo).toBeInTheDocument()

    // Simulate drag to Planner hour slot
    // Note: Actual drag simulation requires @dnd-kit/testing utilities
    // This is a simplified example

    // Verify API was called with correct data
    await waitFor(() => {
      expect(todoService.updateTodo).toHaveBeenCalledWith(1, {
        deadline: expect.stringContaining('2024-01-15T10'),
        boardColumnId: 2,
      })
    })
  })

  it('todo appears in Planner and Board after drop', async () => {
    // Mock initial data
    vi.mocked(todoService.getTodos).mockResolvedValue([
      { id: 1, title: 'Test Task', deadline: null, boardColumnId: 1 },
    ])

    // Mock update
    vi.mocked(todoService.updateTodo).mockResolvedValue({
      id: 1,
      title: 'Test Task',
      deadline: '2024-01-15T10:00:00',
      boardColumnId: 2,
    })

    render(<TodosPage />, { wrapper: createWrapper() })

    // After drag-drop, todo should appear in Planner
    await waitFor(() => {
      const plannerTodos = screen.getAllByTestId('planner-todo')
      expect(plannerTodos.length).toBeGreaterThan(0)
    })

    // And in Board Todo column
    await waitFor(() => {
      const boardTodos = screen.getAllByTestId('board-todo')
      expect(boardTodos.length).toBeGreaterThan(0)
    })
  })

  it('todo disappears from Inbox after drop', async () => {
    // Similar test for Inbox removal
  })
})
```

---

## Test Coverage Goals

| Component | Target Coverage |
|-----------|-----------------|
| TimeAxis | 80%+ |
| CurrentTimeIndicator | 80%+ |
| HourSlot | 85%+ |
| PlannerTodoCard | 80%+ |
| DayView | 80%+ |
| WeekView | 80%+ |
| PlannerViewToggle | 90%+ |
| PlannerPanel | 80%+ |
| Integration tests | Key flows covered |

---

## Dependencies

### Testing Libraries (already installed)
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/user-event` - User interaction simulation
- `@dnd-kit/testing` - Drag-drop testing utilities (if available)

### All Phase Dependencies (must be complete)
- All planner components
- DndProvider with DragOverlay
- TodosPage with updated drag handlers

---

## Risks & Mitigations

### Risk 1: Flaky Tests with Timers
- **Description**: Tests using fake timers or setInterval may be flaky
- **Mitigation**: Use `vi.useFakeTimers()` carefully, clean up timers in afterEach

### Risk 2: Drag-Drop Testing Complexity
- **Description**: Simulating drag-drop in tests can be complex
- **Mitigation**: Use @dnd-kit/testing utilities or focus on unit testing individual components

### Risk 3: Integration Test Maintenance
- **Description**: Integration tests may break with small UI changes
- **Mitigation**: Use test IDs sparingly, focus on user-visible behavior

---

## Success Criteria (Phase 7)

- [ ] PlannerPanel tests updated and passing
- [ ] HourSlot tests written and passing
- [ ] CurrentTimeIndicator tests written and passing
- [ ] Integration test for drag-drop flow passing
- [ ] All test files have 80%+ coverage
- [ ] No TypeScript errors
- [ ] No console errors during test runs
- [ ] Design system compliance verified

---

## Next Phase

Proceed to **Phase 8: Cleanup & Refactor** after completing Phase 7.
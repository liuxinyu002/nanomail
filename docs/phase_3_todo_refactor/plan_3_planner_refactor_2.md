# Plan 3 Phase 2: Day View Implementation

> Part of: Planner Component Refactor
> Previous: Phase 1 (Infrastructure Setup)
> Next: Phase 3 (Week View Implementation)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Day View Structure
- Fixed 24-hour timeline render (0:00 - 23:59)
- Auto-scroll to current time minus 1-2 hours on mount
- Hour slot height: `min-h-[60px]` to `min-h-[80px]`
- Current time indicator: red line + dot (absolute positioned, updates every minute)
- Multiple tasks in same hour: flex-col stack with auto height
- Empty hour slots show subtle dashed border placeholder

### Data Model
- Reuse existing `deadline` field for time positioning
- On drag from Inbox to Planner:
  - Set `deadline` to the target datetime
  - Change `boardColumnId = 2` (Todo column)
- Three-panel linkage: Optimistic Update (card disappears from Inbox, appears in Planner + Board)

### Drag Animation (@dnd-kit only)
- Drag feedback: `shadow-lg` + `scale(0.95)` on dragged item
- Placeholder: themed border empty box (`border-2 border-dashed border-gray-300`)
- Use `DragOverlay` for natural transitions during drag
- No external animation libraries

### Design System Compliance
- Follow `docs/SPEC/design-system.md`
- Animations: fade-in 150ms ease-out, fade-out 100ms ease-in
- No scale effects for menus (but OK for drag feedback)
- Colors: blue-600 for primary, gray-50 for hover states

---

## Architecture

### Component Structure (Phase 2 additions)
```
packages/frontend/src/features/todos/planner/
├── HourSlot.tsx              # Single hour slot (droppable)
├── PlannerTodoCard.tsx       # Compact todo card for Planner
├── DayView.tsx               # Day view container
└── DayView.test.tsx          # Unit tests
```

### Data Flow
```
PlannerPanel
  └── DayView
        ├── TimeAxis (from Phase 1)
        ├── HourSlot (droppable)
        │     └── PlannerTodoCard
        └── CurrentTimeIndicator (from Phase 1)
```

---

## Phase 2 Tasks (4 files)

### Step 2.1: Create HourSlot component

- **File**: `packages/frontend/src/features/todos/planner/HourSlot.tsx`
- **Action**: Create droppable hour slot component
- **Why**: Core building block for day/week timeline
- **Dependencies**: Phase 1 (planner directory)
- **Risk**: Medium (dnd-kit integration)

**Implementation notes**:
- Accept `hour` (0-23), `date` (Date), and `todos` (TodoItem[])
- Use `useDroppable` with id `planner-hour-{date}-{hour}`
- Pass `date` and `hour` in droppable data for drag handling
- Visual feedback on drag-over: `bg-blue-50 ring-2 ring-blue-300`
- Render `PlannerTodoCard` for each todo in this hour

**Props interface**:
```typescript
interface HourSlotProps {
  date: Date
  hour: number
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
  className?: string
}
```

**Example structure**:
```tsx
import { useDroppable } from '@dnd-kit/core'

export function HourSlot({ date, hour, todos, onTodoClick, className }: HourSlotProps) {
  const droppableId = `planner-hour-${format(date, 'yyyy-MM-dd')}-${hour}`

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'planner',
      date: format(date, 'yyyy-MM-dd'),
      hour,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      className={cn(
        'min-h-[60px] border-b border-l border-gray-200 p-1 transition-colors',
        isOver && 'bg-blue-50 ring-2 ring-blue-300 ring-inset',
        todos.length === 0 && 'border-2 border-dashed border-gray-100',
        className
      )}
    >
      {todos.map(todo => (
        <PlannerTodoCard
          key={todo.id}
          todo={todo}
          onClick={() => onTodoClick?.(todo)}
        />
      ))}
    </div>
  )
}
```

---

### Step 2.2: Create PlannerTodoCard component

- **File**: `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx`
- **Action**: Create compact todo card optimized for planner display
- **Why**: Smaller footprint than regular TodoItem for timeline view
- **Dependencies**: None
- **Risk**: Low

**Implementation notes**:
- **CRITICAL: Minimal design for vertical space efficiency**
  - Only render: **color bar (board status indicator) + title (single line, truncate)**
  - **DO NOT render description** - wastes precious vertical space in timeline grid
  - Users can click card to open detail modal for full information
- Color bar: 3-4px width on left edge, color based on boardColumnId
- Title: `truncate` class, single line, max 1 line
- Compact padding: `p-1` or `py-0.5 px-1`
- Click to open detail/edit modal

**Props interface**:
```typescript
interface PlannerTodoCardProps {
  todo: TodoItem
  onClick?: () => void
  className?: string
}
```

**Example structure**:
```tsx
import { getColumnColor } from '@/constants/colors'

export function PlannerTodoCard({ todo, onClick, className }: PlannerTodoCardProps) {
  const colorClass = getColumnColor(todo.boardColumnId)

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer',
        'bg-white hover:bg-gray-50 transition-colors',
        className
      )}
    >
      {/* Color bar indicator */}
      <div className={cn('w-1 h-full min-h-4 rounded-full', colorClass)} />

      {/* Title only - NO description */}
      <span className="flex-1 text-xs truncate">
        {todo.title}
      </span>
    </div>
  )
}
```

---

### Step 2.3: Create DayView component

- **File**: `packages/frontend/src/features/todos/planner/DayView.tsx`
- **Action**: Create day view with 24-hour timeline
- **Why**: Default view for Planner panel
- **Dependencies**: Phase 1 (TimeAxis, CurrentTimeIndicator), Phase 2 Step 2.1-2.2 (HourSlot, PlannerTodoCard)
- **Risk**: Medium

**Implementation notes**:
- Props: `date`, `todos`, `onTodoClick`
- Filter todos by date (matching deadline date)
- Render TimeAxis on left, HourSlots in main area
- Group todos by hour for each HourSlot
- **Container requirements for auto-scroll safety**:
  - Parent container must have `overflow-y-auto` and fixed height
  - This prevents `scrollIntoView` from scrolling the entire page body
- CurrentTimeIndicator overlays the timeline

**Props interface**:
```typescript
interface DayViewProps {
  date: Date
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
  className?: string
}
```

**Auto-scroll logic**:
```typescript
useEffect(() => {
  if (timelineRef.current) {
    const currentHour = new Date().getHours()
    const targetHour = Math.max(0, currentHour - 2)
    const hourElement = timelineRef.current.querySelector(`[data-hour="${targetHour}"]`)

    // SAFE: Use scrollTop calculation instead of scrollIntoView to avoid page scroll
    if (hourElement && timelineRef.current) {
      const containerHeight = timelineRef.current.clientHeight
      const targetOffset = hourElement.getBoundingClientRect().top - timelineRef.current.getBoundingClientRect().top
      timelineRef.current.scrollTop = targetOffset - containerHeight / 4
    }
  }
}, [])
```

**Example structure**:
```tsx
export function DayView({ date, todos, onTodoClick, className }: DayViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null)

  // Filter todos for this date
  const dateTodos = useMemo(() => {
    return todos.filter(t => {
      if (!t.deadline) return false
      return isSameDay(new Date(t.deadline), date)
    })
  }, [todos, date])

  // Group todos by hour
  const todosByHour = useMemo(() => {
    const grouped: Record<number, TodoItem[]> = {}
    dateTodos.forEach(todo => {
      if (todo.deadline) {
        const hour = new Date(todo.deadline).getHours()
        if (!grouped[hour]) grouped[hour] = []
        grouped[hour].push(todo)
      }
    })
    return grouped
  }, [dateTodos])

  return (
    <div className={cn('flex h-full', className)}>
      <TimeAxis className="shrink-0" />

      <div ref={timelineRef} className="flex-1 overflow-y-auto relative">
        {Array.from({ length: 24 }).map((_, hour) => (
          <HourSlot
            key={hour}
            date={date}
            hour={hour}
            todos={todosByHour[hour] || []}
            onTodoClick={onTodoClick}
          />
        ))}

        <CurrentTimeIndicator containerRef={timelineRef} />
      </div>
    </div>
  )
}
```

---

### Step 2.4: Create DayView test file

- **File**: `packages/frontend/src/features/todos/planner/DayView.test.tsx`
- **Action**: Write unit tests for DayView component
- **Why**: Ensure correct rendering and behavior
- **Dependencies**: Step 2.3 (DayView)
- **Risk**: Low

**Test cases**:
- Renders 24 hour slots
- Displays todos in correct hour slots
- Shows empty state when no todos
- Auto-scrolls to current time on mount
- CurrentTimeIndicator renders correctly

**Example test structure**:
```tsx
import { render, screen } from '@testing-library/react'
import { DayView } from './DayView'

describe('DayView', () => {
  const mockTodos: TodoItem[] = [
    { id: 1, title: 'Task at 10am', deadline: '2024-01-15T10:00:00', boardColumnId: 2 },
    { id: 2, title: 'Task at 14pm', deadline: '2024-01-15T14:00:00', boardColumnId: 2 },
  ]

  it('renders 24 hour slots', () => {
    render(<DayView date={new Date('2024-01-15')} todos={mockTodos} />)

    // Verify 24 hour slots are rendered
    const hourSlots = screen.getAllByTestId('hour-slot')
    expect(hourSlots).toHaveLength(24)
  })

  it('displays todos in correct hour slots', () => {
    render(<DayView date={new Date('2024-01-15')} todos={mockTodos} />)

    // Check that todos appear in correct hour slots
    expect(screen.getByText('Task at 10am')).toBeInTheDocument()
    expect(screen.getByText('Task at 14pm')).toBeInTheDocument()
  })

  it('shows empty state when no todos', () => {
    render(<DayView date={new Date('2024-01-15')} todos={[]} />)

    // All hour slots should show dashed border placeholder
    const emptySlots = screen.getAllByTestId('hour-slot-empty')
    expect(emptySlots).toHaveLength(24)
  })
})
```

---

## Dependencies

### Phase 1 Dependencies (must be complete)
- `planner/index.ts` - Barrel export
- `TimeAxis.tsx` - 24-hour time axis
- `CurrentTimeIndicator.tsx` - Red line + dot indicator

### External Dependencies (already installed)
- `@dnd-kit/core` - Drag-drop core
- `date-fns` - Date manipulation (isSameDay, format)

### Internal Dependencies
- `@nanomail/shared` - Todo types and schemas
- `@/lib/utils` - Utility functions (cn)
- `@/constants/colors` - Column color mappings

---

## Success Criteria (Phase 2)

- [ ] `HourSlot` component renders with droppable functionality
- [ ] `HourSlot` shows visual feedback on drag-over
- [ ] `PlannerTodoCard` renders minimal design (color bar + title only)
- [ ] `PlannerTodoCard` does NOT render description
- [ ] `DayView` renders 24 hour slots with TimeAxis
- [ ] `DayView` auto-scrolls to current time on mount
- [ ] `DayView` groups todos by hour correctly
- [ ] `CurrentTimeIndicator` overlays timeline correctly
- [ ] Unit tests pass for DayView component

---

## Next Phase

Proceed to **Phase 3: Week View Implementation** after completing Phase 2.